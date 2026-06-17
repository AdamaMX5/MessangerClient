import { request } from './httpClient'
import { getDeviceFingerprint, setAccessToken } from './tokenStore'

const BASE = import.meta.env.VITE_AUTH_SERVICE_URL ?? 'https://auth.freischule.info'

export type CheckEmailStatus = 'login' | 'register'

export interface AuthSession {
  id: string
  email: string
  roles: string[]
  access_token: string
  status: string
  last_login: string
}

function deviceName(): string {
  return navigator.userAgent.slice(0, 100)
}

function readCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : ''
}

let inFlightRefresh: Promise<string> | null = null

export const authService = {
  async checkEmail(email: string): Promise<CheckEmailStatus> {
    const res = await request<{ status: CheckEmailStatus }>(`${BASE}/user/check-email`, {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email }),
    })
    return res.status
  },

  async login(email: string, password: string): Promise<AuthSession> {
    const res = await request<AuthSession>(`${BASE}/user/login`, {
      method: 'POST',
      skipAuth: true,
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        device_fingerprint: getDeviceFingerprint(),
        device_name: deviceName(),
      }),
    })
    setAccessToken(res.access_token)
    return res
  },

  async registerComplete(email: string, password: string, repassword: string): Promise<AuthSession> {
    const res = await request<AuthSession>(`${BASE}/user/register-complete`, {
      method: 'POST',
      skipAuth: true,
      credentials: 'include',
      body: JSON.stringify({
        email,
        password,
        repassword,
        device_fingerprint: getDeviceFingerprint(),
        device_name: deviceName(),
      }),
    })
    setAccessToken(res.access_token)
    return res
  },

  refresh(): Promise<string> {
    // Share a single in-flight refresh: the server rotates the refresh token on
    // every call, so two parallel requests would race and one would fail with a
    // stale (already-rotated) token, invalidating a valid session.
    if (inFlightRefresh) return inFlightRefresh
    inFlightRefresh = (async () => {
      const res = await request<{ access_token: string }>(`${BASE}/user/refresh`, {
        method: 'POST',
        skipAuth: true,
        credentials: 'include',
        headers: { 'X-CSRF-Token': readCookie('csrf_token') },
      })
      setAccessToken(res.access_token)
      return res.access_token
    })()
    void inFlightRefresh.catch(() => {}).finally(() => { inFlightRefresh = null })
    return inFlightRefresh
  },

  async logout(): Promise<void> {
    await request<{ status: string }>(`${BASE}/user/logout`, {
      method: 'POST',
      skipAuth: true,
      credentials: 'include',
    })
  },

  async logoutAll(): Promise<void> {
    await request<{ status: string }>(`${BASE}/user/logout-all`, { method: 'POST' })
  },
}
