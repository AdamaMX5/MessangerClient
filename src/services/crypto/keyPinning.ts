// Trust-On-First-Use (TOFU) pinning of recipients' public keys (#13).
//
// The first time we see a user's public key we remember ("pin") it. On every
// later fetch we compare against the pin: a match is trusted, a change is a
// warning (possible key substitution / MITM by a compromised ProfileService).
// A changed key is NEVER pinned automatically — the user must explicitly accept
// it (mirrors Signal's "safety number changed" flow).
//
// Pins are PUBLIC keys, not secrets, so persisting them in localStorage is
// acceptable (unlike the access token / secret key, which stay in memory). They
// are keyed per userId and survive reloads — TOFU is meaningless without
// persistence. An attacker with XSS could rewrite pins, which only downgrades
// TOFU to its no-pinning baseline; it never exposes secret material.

// Pins are namespaced by the LOCAL logged-in user so that two accounts sharing a
// browser do not inherit each other's trust decisions (audit #13, finding #5).
const STORAGE_PREFIX = 'messanger.e2e.keypins.v1.'
let ownerId = 'anon'
function storageKey(): string {
  return STORAGE_PREFIX + ownerId
}

export type TofuResult = 'first-use' | 'match' | 'mismatch'

// Pure decision function — exposed for testing the TOFU state machine without
// any storage. `pinned` is the remembered key (or null if none yet).
export function tofuDecision(pinned: string | null, incoming: string): TofuResult {
  if (pinned === null) return 'first-use'
  return pinned === incoming ? 'match' : 'mismatch'
}

// Storage abstraction: real localStorage in the browser, in-memory fallback in
// non-DOM environments (tests / SSR) so the module never throws.
const memory = new Map<string, string>()
function backend() {
  try {
    if (globalThis.localStorage) return globalThis.localStorage
  } catch {
    // accessing localStorage can throw in sandboxed contexts
  }
  return {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
    removeItem: (k: string) => void memory.delete(k),
  }
}

function readAll(): Record<string, string> {
  try {
    const raw = backend().getItem(storageKey())
    return raw ? (JSON.parse(raw) as Record<string, string>) : {}
  } catch {
    return {}
  }
}

function writeAll(map: Record<string, string>): void {
  try {
    backend().setItem(storageKey(), JSON.stringify(map))
  } catch {
    // storage full / unavailable — TOFU silently degrades, never blocks
  }
}

export const keyPinning = {
  // Scope all pin reads/writes to the given local user (call on login; reset on
  // logout). Different accounts on the same browser keep separate pin sets.
  setOwner(localUserId: string): void {
    ownerId = localUserId || 'anon'
  },

  getPinned(userId: string): string | null {
    return readAll()[userId] ?? null
  },

  // Compare an incoming key against the pin. On first use it pins the key and
  // returns 'first-use'; a matching key returns 'match'; a changed key returns
  // 'mismatch' WITHOUT updating the pin.
  checkAndPin(userId: string, publicKey: string): TofuResult {
    const all = readAll()
    const decision = tofuDecision(all[userId] ?? null, publicKey)
    if (decision === 'first-use') {
      all[userId] = publicKey
      writeAll(all)
    }
    return decision
  },

  // Explicitly accept a changed key (user verified it out of band) — overwrites
  // the pin so future fetches match again.
  acceptKey(userId: string, publicKey: string): void {
    const all = readAll()
    all[userId] = publicKey
    writeAll(all)
  },

  // Test/maintenance helper — drop all pins for the current owner.
  clearAll(): void {
    try { backend().removeItem(storageKey()) } catch { /* ignore */ }
    memory.clear()
  },
}
