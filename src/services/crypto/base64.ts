// Binary-safe Base64 + UTF-8 helpers shared by the crypto layer. Implemented
// without external deps so they work identically in the browser (Vite) and in
// Node (vitest). `btoa`/`atob` and `TextEncoder`/`TextDecoder` are available in
// both runtimes (Node 16+).

const encoder = new TextEncoder()
const decoder = new TextDecoder()

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  // Chunk to stay well under the argument-count limit of String.fromCharCode.
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export function utf8ToBytes(text: string): Uint8Array {
  return encoder.encode(text)
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return decoder.decode(bytes)
}
