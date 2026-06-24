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

// ─── DMs ─────────────────────────────────────────────────────────────────────

// Encrypt a DM body for `recipientId` if both sides are E2E-ready, else return
// the plaintext unchanged.
export async function encryptDmBody(recipientId: string, plaintext: string): Promise<string> {
  if (!e2eKeyStore.isUnlocked()) return plaintext
  const pub = await e2eService.getRecipientPublicKey(recipientId)
  if (!pub) return plaintext
  try {
    return sealForRecipient(plaintext, pub)
  } catch {
    return plaintext
  }
}

// Decrypt a DM body for display. Plaintext bodies pass through; sealed bodies we
// cannot open render as a locked placeholder.
export function decryptDmBody(body: string): string {
  if (!isEnvelope(body)) return body
  const secret = e2eKeyStore.getSecretKey()
  if (!secret) return LOCKED_PLACEHOLDER
  return openFromSender(body, secret) ?? LOCKED_PLACEHOLDER
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

// Decrypt a channel body using the group key of its embedded version.
export function decryptChannelBody(channelId: string, body: string): string {
  if (!isEnvelope(body)) return body
  const version = channelKeyVersion(body)
  if (version === null) return body
  const key = e2eKeyStore.getChannelKey(channelId, version)
  if (!key) return LOCKED_PLACEHOLDER
  return openFromChannel(body, key) ?? LOCKED_PLACEHOLDER
}
