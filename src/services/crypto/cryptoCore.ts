// Pure cryptographic primitives for the MessengerClient E2E layer.
//
// Built on tweetnacl (audited, ~7 kb): `nacl.box` = X25519 + XSalsa20-Poly1305
// for asymmetric 1:1 sealing, `nacl.secretbox` = XSalsa20-Poly1305 for the
// symmetric channel group key. Every function here is pure and synchronous so
// it can be unit-tested without any backend (see cryptoCore.test.ts).
//
// Encoding convention: keys, nonces and ciphertexts cross module boundaries as
// Base64 strings; raw byte arrays never leave this file's helpers.

import nacl from 'tweetnacl'
import { base64ToBytes, bytesToBase64, bytesToUtf8, utf8ToBytes } from './base64'
import {
  decodeEnvelope, encodeEnvelope,
  type ChannelEnvelope, type DmEnvelope,
} from './envelope'

export interface KeyPairB64 {
  publicKey: string
  secretKey: string
}

// ─── Key generation ──────────────────────────────────────────────────────────

// Long-term personal X25519 keypair. The public key is published to the
// ProfileService; the secret key is kept in memory and backed up password-
// encrypted (see keyBackup.ts).
export function generateUserKeyPair(): KeyPairB64 {
  const kp = nacl.box.keyPair()
  return { publicKey: bytesToBase64(kp.publicKey), secretKey: bytesToBase64(kp.secretKey) }
}

// Fresh symmetric 256-bit channel group key (Base64). One per channel per
// version. Rotation on join/leave is supported by e2eService.rotateChannelKey
// but is not yet auto-triggered from the membership flow (follow-up of #8).
export function generateChannelKey(): string {
  return bytesToBase64(nacl.randomBytes(nacl.secretbox.keyLength))
}

// ─── 1:1 DM sealing (asymmetric, forward secrecy) ────────────────────────────

// Seal a plaintext for a single recipient. A throwaway ephemeral keypair is
// generated per message so compromise of the long-term key does not retroactively
// expose past messages (forward secrecy). Returns the tagged envelope string.
// NOTE: this does NOT authenticate the sender — anyone holding the recipient's
// public key can craft a box. Sender trust comes from the JWT-verified
// `senderId` on the MessageService, not the crypto (see CLAUDE.md threat model).
export function sealForRecipient(plaintext: string, recipientPublicKeyB64: string): string {
  const ephemeral = nacl.box.keyPair()
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const ct = nacl.box(
    utf8ToBytes(plaintext),
    nonce,
    base64ToBytes(recipientPublicKeyB64),
    ephemeral.secretKey,
  )
  const env: DmEnvelope = {
    alg: 'box',
    epk: bytesToBase64(ephemeral.publicKey),
    n: bytesToBase64(nonce),
    ct: bytesToBase64(ct),
  }
  return encodeEnvelope(env)
}

// Open a DM envelope with the recipient's long-term secret key. Returns null on
// any failure (wrong key, tampered ciphertext, malformed envelope).
export function openFromSender(body: string, mySecretKeyB64: string): string | null {
  const env = decodeEnvelope(body)
  if (!env || env.alg !== 'box') return null
  try {
    const opened = nacl.box.open(
      base64ToBytes(env.ct),
      base64ToBytes(env.n),
      base64ToBytes(env.epk),
      base64ToBytes(mySecretKeyB64),
    )
    return opened ? bytesToUtf8(opened) : null
  } catch {
    return null
  }
}

// ─── Channel group-key distribution ──────────────────────────────────────────

// Wrap a channel group key for one member by sealing it to their public key.
// Reuses the DM box construction, so only that member's secret key unwraps it.
export function wrapChannelKeyForMember(channelKeyB64: string, memberPublicKeyB64: string): string {
  return sealForRecipient(channelKeyB64, memberPublicKeyB64)
}

// Unwrap a channel group key that was sealed to me with my long-term secret key.
export function unwrapChannelKey(wrapped: string, mySecretKeyB64: string): string | null {
  return openFromSender(wrapped, mySecretKeyB64)
}

// ─── Channel message sealing (symmetric) ─────────────────────────────────────

// Seal a plaintext with the channel group key of `keyVersion`. The version is
// embedded so the reader can pick the right key after rotations.
export function sealForChannel(plaintext: string, channelKeyB64: string, keyVersion: number): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const ct = nacl.secretbox(utf8ToBytes(plaintext), nonce, base64ToBytes(channelKeyB64))
  const env: ChannelEnvelope = {
    alg: 'secretbox',
    kv: keyVersion,
    n: bytesToBase64(nonce),
    ct: bytesToBase64(ct),
  }
  return encodeEnvelope(env)
}

// Open a channel envelope with the group key of its embedded version. Returns
// null on any failure. The version a caller must supply the key for is exposed
// via `channelKeyVersion`.
export function openFromChannel(body: string, channelKeyB64: string): string | null {
  const env = decodeEnvelope(body)
  if (!env || env.alg !== 'secretbox') return null
  try {
    const opened = nacl.secretbox.open(base64ToBytes(env.ct), base64ToBytes(env.n), base64ToBytes(channelKeyB64))
    return opened ? bytesToUtf8(opened) : null
  } catch {
    return null
  }
}

// Which group-key version a channel envelope needs, or null if `body` is not a
// channel envelope. Lets the caller fetch the right key before decrypting.
export function channelKeyVersion(body: string): number | null {
  const env = decodeEnvelope(body)
  return env && env.alg === 'secretbox' ? env.kv : null
}
