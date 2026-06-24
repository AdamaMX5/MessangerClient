// Password-protected backup of the personal secret key.
//
// The secret key is wrapped with an AES-GCM key derived from the user's password
// via PBKDF2 (SHA-256). The resulting blob is what we store in the ObjectService
// (`e2e-keys`); without the password it is useless, and the password never
// leaves the device. This enables multi-device login: a second device downloads
// the blob and unlocks it with the same password (plan.md "Multi-Device").
//
// Uses WebCrypto (`crypto.subtle`), available in the browser and in Node 20+.

import { base64ToBytes, bytesToBase64, utf8ToBytes } from './base64'

// Iteration count — OWASP-recommended floor for PBKDF2-HMAC-SHA256 (2023+).
const PBKDF2_ITERATIONS = 600_000
const SALT_BYTES = 16
const IV_BYTES = 12

export interface KeyBackupBlob {
  v: 1
  kdf: 'PBKDF2-SHA256'
  iter: number
  salt: string // Base64
  iv: string // Base64
  ct: string // Base64 — AES-GCM ciphertext of the secret key bytes
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('WebCrypto nicht verfügbar')
  return c.subtle
}

// Copy a (possibly SharedArrayBuffer-backed) byte view into a fresh ArrayBuffer.
// WebCrypto's typings require a plain ArrayBuffer/ArrayBufferView<ArrayBuffer>
// (TS 5.7+ lib.dom), which our Base64/UTF-8 helpers do not guarantee.
function ab(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function deriveAesKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await subtle().importKey('raw', ab(utf8ToBytes(password)), 'PBKDF2', false, ['deriveKey'])
  return subtle().deriveKey(
    { name: 'PBKDF2', salt: ab(salt), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

// Encrypt a Base64 secret key into a password-protected backup blob.
export async function encryptSecretKey(secretKeyB64: string, password: string): Promise<KeyBackupBlob> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const aesKey = await deriveAesKey(password, salt, PBKDF2_ITERATIONS)
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv: ab(iv) }, aesKey, ab(base64ToBytes(secretKeyB64)))
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: PBKDF2_ITERATIONS,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ct: bytesToBase64(new Uint8Array(ct)),
  }
}

// Decrypt a backup blob back into the Base64 secret key. Throws on a wrong
// password or tampered blob (AES-GCM authentication failure).
export async function decryptSecretKey(blob: KeyBackupBlob, password: string): Promise<string> {
  const aesKey = await deriveAesKey(password, base64ToBytes(blob.salt), blob.iter)
  let plain: ArrayBuffer
  try {
    plain = await subtle().decrypt({ name: 'AES-GCM', iv: ab(base64ToBytes(blob.iv)) }, aesKey, ab(base64ToBytes(blob.ct)))
  } catch {
    throw new Error('Falsches Passwort oder beschädigtes Key-Backup')
  }
  return bytesToBase64(new Uint8Array(plain))
}
