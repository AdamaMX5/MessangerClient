// High-level encrypt-on-send / decrypt-on-display helpers used by AppContext.
//
// Design rule: these never throw and always keep the app usable. When E2E is
// locked, unavailable, or a body is plaintext, the helpers pass the text through
// unchanged. Encryption is only applied when a key is actually available, so a
// sender and reader always converge on the same displayed text.

import { e2eService } from '../e2eService'
import { e2eKeyStore } from './e2eKeyStore'
import {
  sealForRecipient, openFromSender,
  sealForChannel, openFromChannel, channelKeyVersion,
} from './cryptoCore'
import { isEnvelope } from './envelope'

// Shown when an encrypted body cannot be opened (locked session / missing key /
// not a member). Keeps ciphertext off the screen without dropping the message.
const LOCKED_PLACEHOLDER = '🔒 Verschlüsselte Nachricht (Sitzung gesperrt)'

// Result of decrypting a body for display. `encrypted` is true ONLY when the
// body was a real envelope that was successfully opened — never merely because
// it carried the envelope tag. This makes the per-message lock indicator (#12)
// unforgeable: a plaintext body that happens to start with the tag, or an
// envelope that cannot be opened, never shows as verified-encrypted.
export interface DecryptedBody {
  text: string
  encrypted: boolean
}

// ─── DMs ─────────────────────────────────────────────────────────────────────

// Encrypt a DM body for `recipientId` if both sides are E2E-ready, else return
// the plaintext unchanged.
export async function encryptDmBody(recipientId: string, plaintext: string): Promise<string> {
  if (!e2eKeyStore.isUnlocked()) return plaintext
  // Encrypt to the TOFU-trusted (pinned) key, not whatever the server returns now,
  // so a later key substitution cannot intercept (#13).
  const pub = await e2eService.trustedKeyFor(recipientId)
  if (!pub) return plaintext
  try {
    return sealForRecipient(plaintext, pub)
  } catch {
    return plaintext
  }
}

// Decrypt a DM body for display. Plaintext bodies pass through (encrypted:false);
// sealed bodies we cannot open render as a locked placeholder (encrypted:false —
// not verified-readable). Only a successful open yields encrypted:true.
export function decryptDmBody(body: string): DecryptedBody {
  if (!isEnvelope(body)) return { text: body, encrypted: false }
  const secret = e2eKeyStore.getSecretKey()
  if (!secret) return { text: LOCKED_PLACEHOLDER, encrypted: false }
  const opened = openFromSender(body, secret)
  return opened === null
    ? { text: LOCKED_PLACEHOLDER, encrypted: false }
    : { text: opened, encrypted: true }
}

// ─── Channels ──────────────────────────────────────────────────────────────

// Encrypt a channel body with the channel's latest group key, if one is loaded.
// Falls back to plaintext when the channel is not E2E-enabled for this session.
export function encryptChannelBody(channelId: string, plaintext: string): string {
  if (!e2eKeyStore.isUnlocked()) return plaintext
  const version = e2eService.latestChannelVersion(channelId)
  if (version === null) return plaintext
  const key = e2eService.getChannelKey(channelId, version)
  if (!key) return plaintext
  try {
    return sealForChannel(plaintext, key, version)
  } catch {
    return plaintext
  }
}

// Decrypt a channel body using the group key of its embedded version. Only a
// successful open yields encrypted:true; a tagged-but-invalid body (e.g. a
// plaintext "e2e:1:…" forgery) has no valid version → passes through unchanged.
export function decryptChannelBody(channelId: string, body: string): DecryptedBody {
  if (!isEnvelope(body)) return { text: body, encrypted: false }
  const version = channelKeyVersion(body)
  if (version === null) return { text: body, encrypted: false }
  const key = e2eKeyStore.getChannelKey(channelId, version)
  if (!key) return { text: LOCKED_PLACEHOLDER, encrypted: false }
  const opened = openFromChannel(body, key)
  return opened === null
    ? { text: LOCKED_PLACEHOLDER, encrypted: false }
    : { text: opened, encrypted: true }
}
