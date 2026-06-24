// E2E orchestration: ties the pure crypto core (cryptoCore/keyBackup) to the
// backend and the in-memory key store.
//
// Storage layout:
// - Personal key (publicKey + password-encrypted secret-key backup) lives in the
//   user's ChatProfil (ProfileService MessangerProfile), so other apps (e.g.
//   VirtualOffice) can read a user's public key cross-app. Written own-profile.
// - Channel group keys are wrapped per member and stored in the ObjectService
//   `channel-keys` collection (ref { channelId, userId }); an admin writes one
//   entry per member, which a single profile (own-write only) could not do.
//
// Every backend interaction is wrapped defensively: missing fields/collections
// degrade the feature to "locked" and the app keeps working with plaintext
// bodies. The server never sees any key in the clear.

import { objectService } from './objectService'
import { profileService } from './profileService'
import { e2eKeyStore } from './crypto/e2eKeyStore'
import {
  generateUserKeyPair, generateChannelKey,
  wrapChannelKeyForMember, unwrapChannelKey,
} from './crypto/cryptoCore'
import { encryptSecretKey, decryptSecretKey, type KeyBackupBlob } from './crypto/keyBackup'
import { keyPinning, type TofuResult } from './crypto/keyPinning'
import { fingerprint } from './crypto/fingerprint'
import {
  deriveKeyringKey, encryptKeyring, decryptKeyring, type KeyringBlob,
} from './crypto/channelKeyring'

const APP = 'MessangerClient'
const CHANNEL_KEYS = 'channel-keys'

// TOFU trust state of a recipient's key as last resolved this session (#13).
// 'first-use' = newly pinned, 'verified' = matched the pin, 'mismatch' = changed
// since it was pinned (possible substitution — warn the user).
export type KeyTrust = 'first-use' | 'verified' | 'mismatch'

function trustOf(result: TofuResult): KeyTrust {
  return result === 'match' ? 'verified' : result
}

// Stored wrapped channel key (collection `channel-keys`, one per member per
// version). `wrappedKey` is the group key sealed to the member's public key.
interface ChannelKeyData {
  channelId: string
  userId: string
  version: number
  wrappedKey: string
  // Derived composite "channelId:userId:version" — a single indexable field so a
  // unique index can be expressed via the ObjectService's single-`field` index
  // API, guaranteeing one key doc per (channel, member, version) and making the
  // rotation write-conflict retry effective against concurrent admins (#11).
  vkey: string
}

function vkeyOf(channelId: string, userId: string, version: number): string {
  return `${channelId}:${userId}:${version}`
}

// Cache of resolved member public keys (userId → Base64 public key | null).
const publicKeyCache = new Map<string, string | null>()

// TOFU trust state per user as last resolved this session (userId → KeyTrust).
const keyTrustCache = new Map<string, KeyTrust>()

// In-memory key-encryption key for the password-encrypted channel keyring (#14)
// plus its stable salt. Derived from the login password at unlock and kept only
// in memory (never the password); wiped on logout. Used to re-encrypt the keyring
// when new channel keys are folded in, without re-prompting for the password.
let keyringKek: CryptoKey | null = null
let keyringSalt: string | null = null

// Re-encrypt the current set of loaded channel keys and persist them into the
// user's ChatProfil. Best-effort: a missing KEK (locked) or backend error simply
// skips persistence — the keys are still distributed via `channel-keys`.
async function persistChannelKeyring(): Promise<void> {
  const kek = keyringKek
  const salt = keyringSalt
  if (!kek || !salt) return
  try {
    const blob = await encryptKeyring(e2eKeyStore.exportChannelKeys(), kek, salt)
    // Guard against a logout/re-login during the await: if the session KEK is no
    // longer the one we encrypted with, drop this write so a stale keyring can
    // never land in the profile after lock() (audit #14, finding #3).
    if (keyringKek !== kek) return
    await profileService.setMyChannelKeyring(JSON.stringify(blob))
  } catch (err) {
    console.warn('[e2e] persisting channel keyring failed', err)
  }
}

// Derive the keyring KEK at unlock and load any stored keyring into the store.
// Never throws: a corrupt/incompatible keyring is ignored (keys remain
// obtainable via the per-member `channel-keys` distribution path).
async function loadChannelKeyring(blobStr: string | null, password: string): Promise<void> {
  try {
    if (blobStr) {
      const blob = JSON.parse(blobStr) as KeyringBlob
      const { kek } = await deriveKeyringKey(password, blob.salt)
      keyringKek = kek
      keyringSalt = blob.salt
      e2eKeyStore.importChannelKeys(await decryptKeyring(blob, kek))
    } else {
      const { kek, salt } = await deriveKeyringKey(password)
      keyringKek = kek
      keyringSalt = salt
    }
  } catch (err) {
    console.warn('[e2e] loading channel keyring failed; continuing without it', err)
  }
}

// Pure helper: the next group-key version given the current maximum (0 if no key
// exists yet). Exposed for unit testing the rotation versioning.
export function nextVersion(currentMax: number): number {
  return currentMax + 1
}

// Outcome of a rotation attempt, surfaced to the UI so a partial/aborted
// rotation is visible instead of a silent downgrade.
export interface RotationResult {
  // The new version on success, or null if the rotation could not complete.
  version: number | null
  // Members that were skipped because they have no published public key — they
  // cannot read from the new version until they provision a key and an admin
  // rotates again.
  skipped: number
  // Why the rotation did not complete (only set when version is null).
  reason?: 'locked' | 'pending' | 'conflict'
}

export const e2eService = {
  // True once the personal secret key is loaded into memory for this session.
  isUnlocked(): boolean {
    return e2eKeyStore.isUnlocked()
  },

  // Unlock (or first-time provision) the personal keypair for `userId` using the
  // login password, reading the backup from the user's ChatProfil. Returns true
  // if E2E is now active, false otherwise. Never throws.
  async unlock(userId: string, password: string): Promise<boolean> {
    try {
      const { publicKey, keyBackup, channelKeyring } = await profileService.getMyE2EKeys()
      if (publicKey && keyBackup) {
        const blob = JSON.parse(keyBackup) as KeyBackupBlob
        const secretKey = await decryptSecretKey(blob, password)
        e2eKeyStore.setKeyPair(publicKey, secretKey)
        publicKeyCache.set(userId, publicKey)
        keyPinning.setOwner(userId)
        // Load the password-encrypted channel keyring (all versions) — #14.
        await loadChannelKeyring(channelKeyring, password)
        return true
      }
      return await this.provision(userId, password)
    } catch (err) {
      // Wrong password, missing field, or network error → stay locked.
      console.warn('[e2e] unlock failed; E2E disabled this session', err)
      return false
    }
  },

  // First-time provisioning: generate a keypair and publish the public key plus
  // the password-encrypted backup into the user's own ChatProfil.
  async provision(userId: string, password: string): Promise<boolean> {
    const kp = generateUserKeyPair()
    const blob = await encryptSecretKey(kp.secretKey, password)
    await profileService.setMyE2EKeys(kp.publicKey, JSON.stringify(blob))
    publicKeyCache.set(userId, kp.publicKey)
    keyPinning.setOwner(userId)
    e2eKeyStore.setKeyPair(kp.publicKey, kp.secretKey)
    // Fresh keyring KEK for this new account (no channel keys yet) — #14.
    await loadChannelKeyring(null, password)
    return true
  },

  // Wipe per-session key material (logout). TOFU pins persist on purpose — they
  // are public and must survive sessions for the trust check to be meaningful.
  lock(): void {
    e2eKeyStore.clear()
    publicKeyCache.clear()
    keyTrustCache.clear()
    keyringKek = null
    keyringSalt = null
    keyPinning.setOwner('') // back to the 'anon' scope until next login
  },

  // Resolve a user's public key (cached) from their ChatProfil. Returns null if
  // unavailable — the caller then sends plaintext to that recipient. Every freshly
  // resolved key runs through TOFU pinning (#13): the trust result is recorded so
  // the UI can flag a changed (possibly substituted) key.
  async getRecipientPublicKey(userId: string): Promise<string | null> {
    if (publicKeyCache.has(userId)) return publicKeyCache.get(userId) ?? null
    const key = await profileService.getPublicKey(userId).catch(() => null)
    publicKeyCache.set(userId, key)
    if (key) keyTrustCache.set(userId, trustOf(keyPinning.checkAndPin(userId, key)))
    return key
  },

  // The key to actually ENCRYPT to: the pinned (first-trusted) key once one
  // exists, otherwise the freshly resolved key (which first-use then pins).
  // Encrypting to the pinned key means a ProfileService that later substitutes a
  // key cannot intercept — only the originally trusted recipient can read — until
  // the user explicitly accepts the change via acceptKeyChange (#13, audit #2).
  async trustedKeyFor(userId: string): Promise<string | null> {
    const current = await this.getRecipientPublicKey(userId) // resolves + runs TOFU
    return keyPinning.getPinned(userId) ?? current
  },

  // TOFU trust state of a user's key as last resolved this session, or null if
  // not resolved yet.
  getKeyTrust(userId: string): KeyTrust | null {
    return keyTrustCache.get(userId) ?? null
  },

  // Human-verifiable fingerprint of a user's current public key, or null if no
  // key is available.
  async keyFingerprint(userId: string): Promise<string | null> {
    const key = await this.getRecipientPublicKey(userId)
    return key ? fingerprint(key) : null
  },

  // Explicitly accept a user's changed key (verified out of band) — re-pins it so
  // it is trusted again.
  acceptKeyChange(userId: string): void {
    const key = publicKeyCache.get(userId)
    if (key) {
      keyPinning.acceptKey(userId, key)
      keyTrustCache.set(userId, 'verified')
    }
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
      let added = false
      for (const o of objs) {
        if (e2eKeyStore.getChannelKey(channelId, o.data.version)) continue
        const key = unwrapChannelKey(o.data.wrappedKey, secret)
        if (key) { e2eKeyStore.setChannelKey(channelId, o.data.version, key); added = true }
      }
      // Fold newly unwrapped keys into the password-encrypted keyring so other
      // devices get them without re-unwrapping, and they survive a keypair rotation.
      if (added) void persistChannelKeyring()
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

  // Highest group-key version that exists for a channel across all members,
  // read from the backend so version numbers never collide on rotation. Returns
  // 0 when no key exists yet. THROWS on a read error — the caller must treat a
  // read failure as "abort" rather than defaulting to version 1, which would
  // overwrite an existing V1 (audit #11, finding #1).
  async channelMaxVersion(channelId: string): Promise<number> {
    const objs = await objectService.list<ChannelKeyData>(CHANNEL_KEYS, {
      ref: { channelId }, limit: 500,
    })
    return objs.reduce((max, o) => Math.max(max, o.data.version), 0)
  },

  // Create the first group key for a channel and distribute it to every member
  // that has a published public key. Admin-only; requires unlock.
  async createChannelKey(channelId: string, memberIds: string[]): Promise<RotationResult> {
    return this.rotateForMembership(channelId, memberIds)
  },

  // Rotate the group key for a membership change: pick the next free version
  // (max existing + 1) and distribute it to exactly `memberIds`. Old versions
  // remain stored so historical messages stay readable; the new version is
  // wrapped only for the given members, so a removed member never receives it
  // (backward secrecy) and a new member can read from this version onward.
  // Admin-only; requires unlock.
  //
  // Concurrency: the version is derived client-side from the backend max. A
  // server-side unique index on { channelId, userId, version } (see CLAUDE.md /
  // Ops) makes a colliding create fail; we then recompute the version and retry.
  // A read failure aborts (reason: 'pending') rather than risking a collision.
  async rotateForMembership(channelId: string, memberIds: string[]): Promise<RotationResult> {
    if (!e2eKeyStore.isUnlocked()) return { version: null, skipped: 0, reason: 'locked' }
    for (let attempt = 0; attempt < 3; attempt++) {
      let max: number
      try {
        max = await this.channelMaxVersion(channelId)
      } catch (err) {
        console.warn('[e2e] reading channel versions failed; rotation aborted', err)
        return { version: null, skipped: 0, reason: 'pending' }
      }
      const version = nextVersion(max)
      try {
        const skipped = await this.distributeKey(channelId, memberIds, version)
        return { version, skipped }
      } catch (err) {
        // Likely a version collision against the unique index — recompute & retry.
        console.warn('[e2e] rotation write conflict, retrying', err)
      }
    }
    return { version: null, skipped: 0, reason: 'conflict' }
  },

  // Generate a fresh group key for `version`, wrap it for every member with a
  // published public key and upload one entry per member. Returns the count of
  // members skipped for lack of a public key. Throws on a write failure so the
  // caller can retry with a recomputed version. Assumes the session is unlocked.
  async distributeKey(channelId: string, memberIds: string[], version: number): Promise<number> {
    const groupKey = generateChannelKey()
    const wraps = await Promise.all(memberIds.map(async uid => {
      // Wrap to the trusted (pinned) key so a substituted key cannot join the rotation.
      const pub = await this.trustedKeyFor(uid)
      return pub ? { uid, wrappedKey: wrapChannelKeyForMember(groupKey, pub) } : null
    }))
    const valid = wraps.filter((w): w is { uid: string; wrappedKey: string } => w !== null)
    await Promise.all(valid.map(w =>
      objectService.create<ChannelKeyData>(CHANNEL_KEYS, {
        data: {
          channelId, userId: w.uid, version, wrappedKey: w.wrappedKey,
          vkey: vkeyOf(channelId, w.uid, version),
        },
        refs: { channelId, userId: w.uid },
        isPublic: false,
        app: APP,
      })))
    // Only adopt the key locally once all uploads succeeded.
    e2eKeyStore.setChannelKey(channelId, version, groupKey)
    // Persist the new version into my password-encrypted keyring (#14).
    void persistChannelKeyring()
    return memberIds.length - valid.length
  },
}
