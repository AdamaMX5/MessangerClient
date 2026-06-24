import { describe, it, expect } from 'vitest'
import {
  generateUserKeyPair, generateChannelKey,
  sealForRecipient, openFromSender,
  wrapChannelKeyForMember, unwrapChannelKey,
  sealForChannel, openFromChannel, channelKeyVersion,
} from './cryptoCore'
import { isEnvelope, ENVELOPE_TAG } from './envelope'

describe('user keypair', () => {
  it('generates distinct base64 public/secret keys', () => {
    const a = generateUserKeyPair()
    const b = generateUserKeyPair()
    expect(a.publicKey).not.toBe(a.secretKey)
    expect(a.publicKey).not.toBe(b.publicKey) // randomness
    expect(() => atob(a.publicKey)).not.toThrow()
    expect(() => atob(a.secretKey)).not.toThrow()
  })
})

describe('DM sealing (nacl.box, ephemeral)', () => {
  it('round-trips a message to the recipient', () => {
    const recipient = generateUserKeyPair()
    const body = sealForRecipient('hallo welt', recipient.publicKey)
    expect(isEnvelope(body)).toBe(true)
    expect(body.startsWith(ENVELOPE_TAG)).toBe(true)
    expect(openFromSender(body, recipient.secretKey)).toBe('hallo welt')
  })

  it('handles unicode payloads', () => {
    const r = generateUserKeyPair()
    const text = 'Grüße 🔐 — ünïcödé'
    expect(openFromSender(sealForRecipient(text, r.publicKey), r.secretKey)).toBe(text)
  })

  it('uses a fresh ephemeral key per message (forward secrecy)', () => {
    const r = generateUserKeyPair()
    const a = sealForRecipient('same', r.publicKey)
    const b = sealForRecipient('same', r.publicKey)
    expect(a).not.toBe(b) // different ephemeral key + nonce
  })

  it('cannot be opened by the wrong secret key', () => {
    const r = generateUserKeyPair()
    const attacker = generateUserKeyPair()
    const body = sealForRecipient('secret', r.publicKey)
    expect(openFromSender(body, attacker.secretKey)).toBeNull()
  })

  it('rejects a tampered ciphertext', () => {
    const r = generateUserKeyPair()
    const body = sealForRecipient('secret', r.publicKey)
    // Flip a character inside the base64 envelope payload.
    const tampered = body.slice(0, -2) + (body.endsWith('A') ? 'B' : 'A') + body.slice(-1)
    expect(openFromSender(tampered, r.secretKey)).toBeNull()
  })

  it('returns null for plaintext input', () => {
    const r = generateUserKeyPair()
    expect(openFromSender('just plaintext', r.secretKey)).toBeNull()
  })
})

describe('channel group key', () => {
  it('round-trips a channel message with secretbox', () => {
    const key = generateChannelKey()
    const body = sealForChannel('channel hi', key, 1)
    expect(channelKeyVersion(body)).toBe(1)
    expect(openFromChannel(body, key)).toBe('channel hi')
  })

  it('embeds and preserves the key version across rotations', () => {
    const v1 = generateChannelKey()
    const v2 = generateChannelKey()
    const oldMsg = sealForChannel('before rotation', v1, 1)
    const newMsg = sealForChannel('after rotation', v2, 2)
    expect(channelKeyVersion(oldMsg)).toBe(1)
    expect(channelKeyVersion(newMsg)).toBe(2)
    // The right key opens each; the wrong version's key does not.
    expect(openFromChannel(oldMsg, v1)).toBe('before rotation')
    expect(openFromChannel(newMsg, v2)).toBe('after rotation')
    expect(openFromChannel(oldMsg, v2)).toBeNull()
  })

  it('cannot be opened with a different group key', () => {
    const key = generateChannelKey()
    const other = generateChannelKey()
    expect(openFromChannel(sealForChannel('x', key, 1), other)).toBeNull()
  })
})

describe('channel key distribution (wrap/unwrap)', () => {
  it('lets a member unwrap a key sealed to their public key', () => {
    const member = generateUserKeyPair()
    const groupKey = generateChannelKey()
    const wrapped = wrapChannelKeyForMember(groupKey, member.publicKey)
    expect(unwrapChannelKey(wrapped, member.secretKey)).toBe(groupKey)
  })

  it('does not let a non-recipient unwrap the key', () => {
    const member = generateUserKeyPair()
    const outsider = generateUserKeyPair()
    const wrapped = wrapChannelKeyForMember(generateChannelKey(), member.publicKey)
    expect(unwrapChannelKey(wrapped, outsider.secretKey)).toBeNull()
  })
})
