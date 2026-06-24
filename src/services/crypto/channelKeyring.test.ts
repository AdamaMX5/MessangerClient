import { describe, it, expect } from 'vitest'
import { deriveKeyringKey, encryptKeyring, decryptKeyring, type Keyring } from './channelKeyring'
import { e2eKeyStore } from './e2eKeyStore'

const ring: Keyring = {
  ch1: { '1': 'a2V5LXYx', '2': 'a2V5LXYy' }, // two versions — historical kept
  ch2: { '1': 'a2V5LWNo' },
}

describe('channel keyring encryption', () => {
  it('round-trips the keyring with the same password', async () => {
    const { kek, salt } = await deriveKeyringKey('pw-123')
    const blob = await encryptKeyring(ring, kek, salt)
    expect(blob.ct).not.toContain('a2V5') // not stored in clear
    const { kek: kek2 } = await deriveKeyringKey('pw-123', blob.salt)
    expect(await decryptKeyring(blob, kek2)).toEqual(ring)
  })

  it('keeps the salt stable so an in-memory KEK stays valid across re-encryptions', async () => {
    const { kek, salt } = await deriveKeyringKey('pw')
    const a = await encryptKeyring(ring, kek, salt)
    const b = await encryptKeyring({ ...ring, ch3: { '1': 'eA==' } }, kek, salt)
    expect(b.salt).toBe(a.salt) // stable salt
    expect(b.iv).not.toBe(a.iv) // fresh iv each time (no nonce reuse)
    expect(await decryptKeyring(b, kek)).toHaveProperty('ch3')
  })

  it('fails to decrypt with the wrong password', async () => {
    const { kek, salt } = await deriveKeyringKey('right')
    const blob = await encryptKeyring(ring, kek, salt)
    const { kek: wrong } = await deriveKeyringKey('wrong', blob.salt)
    await expect(decryptKeyring(blob, wrong)).rejects.toThrow()
  })
})

describe('e2eKeyStore channel-key export/import', () => {
  it('round-trips all channels and versions', () => {
    e2eKeyStore.clear()
    e2eKeyStore.setChannelKey('chA', 1, 'k1')
    e2eKeyStore.setChannelKey('chA', 2, 'k2')
    e2eKeyStore.setChannelKey('chB', 1, 'k3')
    const dump = e2eKeyStore.exportChannelKeys()
    expect(dump).toEqual({ chA: { '1': 'k1', '2': 'k2' }, chB: { '1': 'k3' } })

    e2eKeyStore.clear()
    e2eKeyStore.importChannelKeys(dump)
    expect(e2eKeyStore.getChannelKey('chA', 2)).toBe('k2')
    expect(e2eKeyStore.latestChannelVersion('chA')).toBe(2)
    e2eKeyStore.clear()
  })
})
