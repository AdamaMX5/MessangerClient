import { describe, it, expect } from 'vitest'
import { encryptSecretKey, decryptSecretKey } from './keyBackup'
import { generateUserKeyPair } from './cryptoCore'

describe('password-protected secret-key backup', () => {
  it('round-trips the secret key with the correct password', async () => {
    const { secretKey } = generateUserKeyPair()
    const blob = await encryptSecretKey(secretKey, 'hunter2')
    expect(blob.kdf).toBe('PBKDF2-SHA256')
    expect(blob.ct).not.toContain(secretKey) // not stored in clear
    expect(await decryptSecretKey(blob, 'hunter2')).toBe(secretKey)
  })

  it('rejects the wrong password (AES-GCM auth failure)', async () => {
    const { secretKey } = generateUserKeyPair()
    const blob = await encryptSecretKey(secretKey, 'correct-horse')
    await expect(decryptSecretKey(blob, 'wrong-password')).rejects.toThrow()
  })

  it('uses a fresh random salt + iv per backup', async () => {
    const { secretKey } = generateUserKeyPair()
    const a = await encryptSecretKey(secretKey, 'pw')
    const b = await encryptSecretKey(secretKey, 'pw')
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ct).not.toBe(b.ct)
  })

  it('fails to decrypt a tampered blob', async () => {
    const { secretKey } = generateUserKeyPair()
    const blob = await encryptSecretKey(secretKey, 'pw')
    const tampered = { ...blob, ct: blob.ct.slice(0, -2) + (blob.ct.endsWith('A') ? 'B' : 'A') + blob.ct.slice(-1) }
    await expect(decryptSecretKey(tampered, 'pw')).rejects.toThrow()
  })
})
