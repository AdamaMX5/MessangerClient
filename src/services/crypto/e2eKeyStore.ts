// In-memory store for the unlocked personal secret key and decrypted channel
// group keys. Mirrors the access-token model (tokenStore.ts): secrets live only
// in memory — never in localStorage/IndexedDB — so XSS cannot exfiltrate them
// and a tab reload re-locks the session until the password unlocks the backup.

let secretKeyB64: string | null = null
let publicKeyB64: string | null = null

// channelId → (keyVersion → Base64 group key). A channel can hold multiple
// versions so historical messages remain readable after rotations.
const channelKeys = new Map<string, Map<number, string>>()

export const e2eKeyStore = {
  // ─── Personal keypair ───────────────────────────────────────────────────
  setKeyPair(publicKey: string, secretKey: string): void {
    publicKeyB64 = publicKey
    secretKeyB64 = secretKey
  },
  getSecretKey(): string | null {
    return secretKeyB64
  },
  getPublicKey(): string | null {
    return publicKeyB64
  },
  isUnlocked(): boolean {
    return secretKeyB64 !== null
  },

  // ─── Channel group keys ─────────────────────────────────────────────────
  setChannelKey(channelId: string, version: number, keyB64: string): void {
    let versions = channelKeys.get(channelId)
    if (!versions) { versions = new Map(); channelKeys.set(channelId, versions) }
    versions.set(version, keyB64)
  },
  getChannelKey(channelId: string, version: number): string | null {
    return channelKeys.get(channelId)?.get(version) ?? null
  },

  // Dump all loaded channel keys as a plain object (channelId → version → key)
  // for the password-encrypted keyring (#14).
  exportChannelKeys(): Record<string, Record<string, string>> {
    const out: Record<string, Record<string, string>> = {}
    for (const [channelId, versions] of channelKeys) {
      out[channelId] = Object.fromEntries(versions)
    }
    return out
  },

  // Load channel keys from a keyring object, merging into whatever is present.
  importChannelKeys(ring: Record<string, Record<string, string>>): void {
    for (const [channelId, versions] of Object.entries(ring)) {
      for (const [version, keyB64] of Object.entries(versions)) {
        this.setChannelKey(channelId, Number(version), keyB64)
      }
    }
  },
  latestChannelVersion(channelId: string): number | null {
    const versions = channelKeys.get(channelId)
    if (!versions || versions.size === 0) return null
    return Math.max(...versions.keys())
  },

  // Wipe everything on logout so no key material outlives the session.
  clear(): void {
    secretKeyB64 = null
    publicKeyB64 = null
    channelKeys.clear()
  },
}
