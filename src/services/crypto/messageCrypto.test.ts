import { describe, it, expect, afterEach } from 'vitest'
import { decryptDmBody, decryptChannelBody } from './messageCrypto'
import { e2eKeyStore } from './e2eKeyStore'
import { generateUserKeyPair, generateChannelKey, sealForRecipient, sealForChannel } from './cryptoCore'

afterEach(() => e2eKeyStore.clear())

// The per-message indicator (#12) must be unforgeable: `encrypted` is true ONLY
// when a real envelope was successfully opened — never from the tag prefix alone.
describe('decryptDmBody encryption flag', () => {
  it('marks genuine opened envelopes as encrypted', () => {
    const me = generateUserKeyPair()
    e2eKeyStore.setKeyPair(me.publicKey, me.secretKey)
    const body = sealForRecipient('geheim', me.publicKey)
    expect(decryptDmBody(body)).toEqual({ text: 'geheim', encrypted: true })
  })

  it('treats plaintext as not encrypted', () => {
    expect(decryptDmBody('hallo')).toEqual({ text: 'hallo', encrypted: false })
  })

  it('does NOT mark a forged "e2e:1:" plaintext as encrypted', () => {
    // A user typing the tag verbatim must not earn a green lock.
    const forged = 'e2e:1:not-a-real-envelope'
    expect(decryptDmBody(forged).encrypted).toBe(false)
  })

  it('marks an unopenable real envelope as not verified (locked, no green lock)', () => {
    const recipient = generateUserKeyPair()
    const body = sealForRecipient('geheim', recipient.publicKey)
    // Session has no secret key loaded → cannot open.
    expect(decryptDmBody(body).encrypted).toBe(false)
  })
})

describe('decryptChannelBody encryption flag', () => {
  it('marks genuine opened channel envelopes as encrypted', () => {
    const key = generateChannelKey()
    e2eKeyStore.setChannelKey('chan1', 1, key)
    const body = sealForChannel('kanal-geheim', key, 1)
    expect(decryptChannelBody('chan1', body)).toEqual({ text: 'kanal-geheim', encrypted: true })
  })

  it('passes a forged "e2e:1:" channel plaintext through without a lock', () => {
    const forged = 'e2e:1:hello'
    expect(decryptChannelBody('chan1', forged)).toEqual({ text: forged, encrypted: false })
  })

  it('does not mark a message as encrypted when the group key is missing', () => {
    const key = generateChannelKey()
    const body = sealForChannel('x', key, 1) // valid envelope, but key not in store
    expect(decryptChannelBody('chan1', body).encrypted).toBe(false)
  })
})
