// On-the-wire envelope formats for E2E-encrypted message bodies.
//
// An encrypted `message.body` is a JSON envelope, Base64-encoded and prefixed
// with a scheme tag so plaintext bodies (legacy / non-encrypted channels) are
// trivially distinguishable and the decrypt path can fall back gracefully.
//
// Layout:  "<TAG><base64(JSON(envelope))>"
//
// The MessageService never sees anything but this opaque string — it stores and
// returns the body verbatim (see plan.md "Ende-zu-Ende-Verschlüsselung").

import { base64ToBytes, bytesToBase64 } from './base64'

// Distinct, human-recognizable prefix. Anything not starting with it is treated
// as plaintext by the decrypt helpers (backward compatibility).
export const ENVELOPE_TAG = 'e2e:1:'

// 1:1 DM envelope — sealed with nacl.box using a per-message ephemeral keypair
// (forward secrecy): only the recipient's long-term secret key can open it.
export interface DmEnvelope {
  alg: 'box'
  // Base64 ephemeral public key generated fresh for this single message.
  epk: string
  // Base64 nonce (24 bytes).
  n: string
  // Base64 ciphertext (Poly1305-authenticated).
  ct: string
}

// Channel envelope — sealed with nacl.secretbox using the symmetric group key of
// the given version. `kv` selects which group-key version decrypts it so old
// messages stay readable across key rotations.
export interface ChannelEnvelope {
  alg: 'secretbox'
  // Group-key version this message was encrypted with.
  kv: number
  n: string
  ct: string
}

export type Envelope = DmEnvelope | ChannelEnvelope

// Serialize an envelope to the tagged Base64 string stored in `message.body`.
export function encodeEnvelope(env: Envelope): string {
  const json = JSON.stringify(env)
  return ENVELOPE_TAG + bytesToBase64(new TextEncoder().encode(json))
}

// True when a body looks like one of our encrypted envelopes.
export function isEnvelope(body: string): boolean {
  return typeof body === 'string' && body.startsWith(ENVELOPE_TAG)
}

// Parse a tagged body back into an envelope, or return null if it is not one
// (plaintext / malformed) — callers fall back to showing the raw body.
export function decodeEnvelope(body: string): Envelope | null {
  if (!isEnvelope(body)) return null
  try {
    const json = new TextDecoder().decode(base64ToBytes(body.slice(ENVELOPE_TAG.length)))
    const parsed = JSON.parse(json)
    if (parsed && (parsed.alg === 'box' || parsed.alg === 'secretbox')) return parsed as Envelope
    return null
  } catch {
    return null
  }
}
