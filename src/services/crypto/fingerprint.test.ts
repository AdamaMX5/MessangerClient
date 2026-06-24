import { describe, it, expect } from 'vitest'
import { fingerprint } from './fingerprint'
import { generateUserKeyPair } from './cryptoCore'

describe('fingerprint', () => {
  it('is deterministic for the same key', async () => {
    const { publicKey } = generateUserKeyPair()
    expect(await fingerprint(publicKey)).toBe(await fingerprint(publicKey))
  })

  it('differs for different keys', async () => {
    const a = generateUserKeyPair()
    const b = generateUserKeyPair()
    expect(await fingerprint(a.publicKey)).not.toBe(await fingerprint(b.publicKey))
  })

  it('formats as eight space-separated 4-char hex groups (128-bit)', async () => {
    const { publicKey } = generateUserKeyPair()
    const fp = await fingerprint(publicKey)
    expect(fp).toMatch(/^([0-9A-F]{4} ){7}[0-9A-F]{4}$/)
  })
})
