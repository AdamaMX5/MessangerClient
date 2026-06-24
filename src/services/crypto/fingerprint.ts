// Human-verifiable fingerprint of a public key.
//
// Derived as SHA-256 over the raw key bytes, truncated to the first 16 bytes
// (128-bit — strong against adversarial fingerprint collisions) and formatted as
// eight space-separated hex groups (e.g. "A1B2 C3D4 … 5678").
// Two users can read these out of band to confirm they hold each other's real
// key — the basis of the TOFU verification UI (#13). Public-key input only, so
// no secret material is involved.

import { base64ToBytes } from './base64'

function subtle(): SubtleCrypto {
  const c = globalThis.crypto
  if (!c?.subtle) throw new Error('WebCrypto nicht verfügbar')
  return c.subtle
}

function toBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

// Compute the display fingerprint for a Base64 public key. Returns eight hex
// groups of four characters (128-bit). Never throws for valid Base64 input.
export async function fingerprint(publicKeyB64: string): Promise<string> {
  const digest = await subtle().digest('SHA-256', toBuffer(base64ToBytes(publicKeyB64)))
  const bytes = new Uint8Array(digest).subarray(0, 16)
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0').toUpperCase()).join('')
  return hex.replace(/(.{4})(?=.)/g, '$1 ')
}
