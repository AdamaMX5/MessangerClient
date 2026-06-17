// In-memory access token store. The access token is NEVER persisted to
// localStorage/sessionStorage (XSS protection) — only the long-lived refresh
// token lives in an HttpOnly cookie set by the AuthService.

let accessToken: string | null = null
const listeners = new Set<() => void>()

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string | null): void {
  accessToken = token
  listeners.forEach(l => l())
}

export function clearAccessToken(): void {
  setAccessToken(null)
}

export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const FINGERPRINT_KEY = 'device_fingerprint'

// The device fingerprint is a stable per-browser id, not a secret — storing it
// in localStorage is fine and lets the AuthService recognise returning devices.
export function getDeviceFingerprint(): string {
  let fp = localStorage.getItem(FINGERPRINT_KEY)
  if (!fp) {
    fp = crypto.randomUUID()
    localStorage.setItem(FINGERPRINT_KEY, fp)
  }
  return fp
}
