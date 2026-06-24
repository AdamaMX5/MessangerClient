// E2E orchestration: ties the pure crypto core (cryptoCore/keyBackup) to the
// backend (ProfileService for public keys, ObjectService for the encrypted
// secret-key backup and the per-member channel group keys) and the in-memory
// key store.
//
// Every backend interaction is wrapped defensively: if a field/collection does
// not exist yet, or a request fails, the feature degrades to "locked" and the
// app keeps working with plaintext bodies (see plan.md — defensive rollout).
// The server never sees any key in the clear.

import { objectService } from './objectService'
import { profileService } from './profileService'
import { e2eKeyStore } from './crypto/e2eKeyStore'
import { generateUserKeyPair } from './crypto/cryptoCore'
import {
  generateChannelKey, wrapChannelKeyForMember, unwrapChannelKey,
} from './crypto/cryptoCore'
import { encryptSecretKey, decryptSecretKey, type KeyBackupBlob } from './crypto/keyBackup'

const APP = 'MessangerClient'
const E2E_KEYS = 'e2e-keys'
const CHANNEL_KEYS = 'channel-keys'

// Stored backup document (collection `e2e-keys`, one per user). `publicKey` is
// kept here too so a fresh device can restore the full keypair from the blob
// alone. `blob` is password-encrypted — useless without the user's password.
interface E2eKeyData {
  userId: string
  publicKey: string
  blob: KeyBackupBlob
}

// Stored wrapped channel key (collection `channel-keys`, one per member per
// version). `wrappedKey` is the group key sealed to the member's public key.
interface ChannelKeyData {
  channelId: string
  userId: string
  version: number
  wrappedKey: string
}

// Cache of resolved member public keys (userId → Base64 public key | null).
const publicKeyCache = new Map<string, string | null>()

async function loadKeyBackup(userId: string) {
  const objs = await objectService.list<E2eKeyData>(E2E_KEYS, { ref: { userId }, limit: 1 })
  return objs[0] ?? null
}

export const e2eService = {
  // True once the personal secret key is loaded into memory for this session.
  isUnlocked(): boolean {
    return e2eKeyStore.isUnlocked()
  },

  // Unlock (or first-time provision) the personal keypair for `userId` using the
  // login password. Returns true if E2E is now active, false if it stayed
  // disabled (backend not ready or wrong password). Never throws.
  async unlock(userId: string, password: string): Promise<boolean> {
    try {
      const existing = await loadKeyBackup(userId)
      if (existing) {
        const secretKey = await decryptSecretKey(existing.data.blob, password)
        e2eKeyStore.setKeyPair(existing.data.publicKey, secretKey)
        return true
      }
      return await this.provision(userId, password)
    } catch (err) {
      // Wrong password, missing collection, or network error → stay locked.
      console.warn('[e2e] unlock failed; E2E disabled this session', err)
      return false
    }
  },

  // First-time provisioning: generate a keypair, publish the public key and
  // upload the password-encrypted backup. Public-key publish failure is
  // tolerated (the keypair still works locally and the backup persists).
  async provision(userId: string, password: string): Promise<boolean> {
    const kp = generateUserKeyPair()
    const blob = await encryptSecretKey(kp.secretKey, password)
    await objectService.create<E2eKeyData>(E2E_KEYS, {
      data: { userId, publicKey: kp.publicKey, blob },
      refs: { userId },
      isPublic: false,
      app: APP,
    })
    await profileService.setPublicKey(kp.publicKey).catch(err =>
      console.warn('[e2e] publishing public key failed; DMs to me may stay plaintext', err))
    publicKeyCache.set(userId, kp.publicKey)
    e2eKeyStore.setKeyPair(kp.publicKey, kp.secretKey)
    return true
  },

  // Wipe all key material (logout).
  lock(): void {
    e2eKeyStore.clear()
    publicKeyCache.clear()
  },

  // Resolve a user's public key (cached). Returns null if unavailable — the
  // caller then sends plaintext to that recipient.
  async getRecipientPublicKey(userId: string): Promise<string | null> {
    if (publicKeyCache.has(userId)) return publicKeyCache.get(userId) ?? null
    const key = await profileService.getPublicKey(userId).catch(() => null)
    publicKeyCache.set(userId, key)
    return key
  },

  // ─── Channel group keys ────────────────────────────────────────────────────

  // Load and unwrap all my channel-key versions for `channelId` into the store.
  // Returns the latest version available to me, or null if none/locked.
  async prepareChannelKeys(channelId: string, userId: string): Promise<number | null> {
    if (!e2eKeyStore.isUnlocked()) return null
    const secret = e2eKeyStore.getSecretKey()!
    try {
      const objs = await objectService.list<ChannelKeyData>(CHANNEL_KEYS, {
        ref: { channelId, userId }, limit: 100,
      })
      for (const o of objs) {
        const key = unwrapChannelKey(o.data.wrappedKey, secret)
        if (key) e2eKeyStore.setChannelKey(channelId, o.data.version, key)
      }
    } catch (err) {
      console.warn('[e2e] loading channel keys failed', err)
    }
    return e2eKeyStore.latestChannelVersion(channelId)
  },

  getChannelKey(channelId: string, version: number): string | null {
    return e2eKeyStore.getChannelKey(channelId, version)
  },

  latestChannelVersion(channelId: string): number | null {
    return e2eKeyStore.latestChannelVersion(channelId)
  },

  // Create the first group key (V1) for a channel and distribute it to every
  // member that has a published public key. Admin-only operation — requires the
  // caller to be unlocked. Members without a public key are skipped (they keep
  // reading plaintext until they provision a key). Returns the version, or null
  // if E2E could not be established.
  async createChannelKey(channelId: string, memberIds: string[]): Promise<number | null> {
    return this.rotateChannelKey(channelId, memberIds, 1)
  },

  // Rotate (or create) the group key to `version` and distribute it to exactly
  // `memberIds`. Old versions remain stored so historical messages stay
  // readable. Returns the version on success, null otherwise.
  async rotateChannelKey(channelId: string, memberIds: string[], version: number): Promise<number | null> {
    if (!e2eKeyStore.isUnlocked()) return null
    try {
      const groupKey = generateChannelKey()
      const wraps = await Promise.all(memberIds.map(async uid => {
        const pub = await this.getRecipientPublicKey(uid)
        return pub ? { uid, wrappedKey: wrapChannelKeyForMember(groupKey, pub) } : null
      }))
      await Promise.all(wraps.filter(Boolean).map(w =>
        objectService.create<ChannelKeyData>(CHANNEL_KEYS, {
          data: { channelId, userId: w!.uid, version, wrappedKey: w!.wrappedKey },
          refs: { channelId, userId: w!.uid },
          isPublic: false,
          app: APP,
        })))
      e2eKeyStore.setChannelKey(channelId, version, groupKey)
      return version
    } catch (err) {
      console.warn('[e2e] channel key rotation failed', err)
      return null
    }
  },
}
