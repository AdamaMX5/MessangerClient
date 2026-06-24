// Password-encrypted channel keyring for multi-device persistence (#14).
//
// The user's own channel group keys — all channels, ALL versions including
// historical ones — are kept in a single object and stored AES-GCM-encrypted in
// the ChatProfil (MessangerProfile.channelKeyring). This gives every device and
// VirtualOffice one bootstrap point: ChatProfil + password → every key, so no
// historical message ever becomes unreadable, even across a personal-keypair
// rotation (which would invalidate the per-member wrapped `channel-keys`).
//
// The encryption key (KEK) is derived from the login password via PBKDF2 and
// kept ONLY in memory for the session (never the password itself), mirroring how
// the secret key is handled. Same construction as keyBackup.ts.

import { base64ToBytes, bytesToBase64, bytesToUtf8, utf8ToBytes } from './base64'

const PBKDF2_ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12

// channelId → (version-as-string → Base64 group key).
export type Keyring = Record<string, Record<string, string>>

export interface KeyringBlob {
  v: 1
  kdf: 'PBKDF2-SHA256'
  iter: number
  salt: string // Base64 — stable across re-encryptions so the in-memory KEK stays valid
  iv: string // Base64 — fresh per encryption (no nonce reuse)
  ct: string // Base64 — AES-GCM ciphertext of JSON(Keyring)
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('WebCrypto nicht verfügbar')
  return c.subtle
}

function ab(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

// Derive a reusable AES-GCM key from the password and salt. When no salt is
// given a fresh one is generated (first-time keyring). The returned key is kept
// in memory for the session and reused for every re-encryption.
export async function deriveKeyringKey(password: string, saltB64?: string): Promise<{ kek: CryptoKey; salt: string }> {
  const salt = saltB64 ? base64ToBytes(saltB64) : globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const baseKey = await subtle().importKey('raw', ab(utf8ToBytes(password)), 'PBKDF2', false, ['deriveKey'])
  const kek = await subtle().deriveKey(
    { name: 'PBKDF2', salt: ab(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  return { kek, salt: bytesToBase64(salt) }
}

export async function encryptKeyring(ring: Keyring, kek: CryptoKey, saltB64: string): Promise<KeyringBlob> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: ab(iv) }, kek, ab(utf8ToBytes(JSON.stringify(ring))))
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: PBKDF2_ITERATIONS,
    salt: saltB64,
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ct)),
  }
}

// Decrypt a keyring blob. Throws on a wrong KEK / tampered blob (AES-GCM auth).
export async function decryptKeyring(blob: KeyringBlob, kek: CryptoKey): Promise<Keyring> {
  const plain = await subtle().decrypt({ name: 'AES-GCM', iv: ab(base64ToBytes(blob.iv)) }, kek, ab(base64ToBytes(blob.ct)))
  return JSON.parse(bytesToUtf8(new Uint8Array(plain))) as Keyring
}
