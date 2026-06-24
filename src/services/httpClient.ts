import { getAccessToken } from './tokenStore'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

// ─── Debug logging (dev only) ────────────────────────────────────────────────
// Toggle: on in `vite` dev by default, or force with VITE_DEBUG_HTTP=true.
// Tree-shaken out of production builds. Secrets are redacted before logging.
const DEBUG = import.meta.env.DEV || import.meta.env.VITE_DEBUG_HTTP === 'true'

const SECRET_KEYS = [
  'password', 'repassword', 'new_password', 'access_token', 'accessToken',
  'token', 'refresh_token', 'csrf_token', 'keyBackup', 'channelKeyring',
  'wrappedKey', 'secretKey', 'blob',
]

// Mask secret values in a JSON-ish string and cap its length for the console.
function redact(text: string | undefined): string {
  if (!text) return '(empty)'
  let out = text
  for (const k of SECRET_KEYS) {
    out = out.replace(new RegExp(`("${k}"\\s*:\\s*)"[^"]*"`, 'g'), '$1"***"')
  }
  return out.length > 600 ? `${out.slice(0, 600)}… (${out.length} chars)` : out
}

// Headers the browser actually exposes to JS (cross-origin responses only reveal
// CORS-safelisted/`Access-Control-Expose-Headers` ones — itself a useful signal).
function readableHeaders(res: Response): Record<string, string> {
  const out: Record<string, string> = {}
  res.headers.forEach((v, k) => { out[k] = v })
  return out
}

function dlog(...args: unknown[]): void {
  if (DEBUG) console.log('[http]', ...args)
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.clone().json()
    if (data && typeof data.message === 'string') return data.message
    if (data && typeof data.error === 'string') return data.error
  } catch {
    // response had no JSON body
  }
  return `${fallback} (HTTP ${res.status})`
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const { skipAuth, headers, body, ...rest } = options
  const finalHeaders: Record<string, string> = { ...(headers as Record<string, string>) }

  if (body !== undefined && finalHeaders['Content-Type'] === undefined) {
    finalHeaders['Content-Type'] = 'application/json'
  }
  if (!skipAuth) {
    const token = getAccessToken()
    if (token) finalHeaders.Authorization = `Bearer ${token}`
  }

  const method = rest.method ?? 'GET'
  dlog(`→ ${method} ${url}`, {
    auth: finalHeaders.Authorization ? 'Bearer ***' : 'none',
    contentType: finalHeaders['Content-Type'],
    credentials: rest.credentials ?? '(default: same-origin)',
    body: typeof body === 'string' ? redact(body) : body === undefined ? undefined : '(non-string body)',
  })

  let res: Response
  try {
    res = await fetch(url, { ...rest, headers: finalHeaders, body })
  } catch (err) {
    // A CORS block, mixed-content block, DNS/connection failure or an aborted
    // request all land here. The browser surfaces the real reason (e.g. the CORS
    // message) in the console as a separate red entry; `err` is usually a terse
    // "TypeError: Failed to fetch" with no detail by design.
    dlog(`✗ ${method} ${url} — fetch REJECTED (CORS / mixed-content / network / aborted?)`, err)
    throw new Error('Netzwerkfehler')
  }

  dlog(`← ${res.status} ${res.statusText} ${url}`, {
    type: res.type, // 'cors' = readable cross-origin; 'opaque' = blocked, body hidden
    ok: res.ok,
    redirected: res.redirected,
    headers: readableHeaders(res),
  })

  if (!res.ok) {
    const msg = await errorMessage(res, 'Anfrage fehlgeschlagen')
    dlog(`← ${res.status} error body ${url}:`, msg)
    throw new Error(msg)
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  dlog(`← body ${url}:`, text ? redact(text) : '(EMPTY body — common with CORS-blocked or proxy 200s)')
  return (text ? JSON.parse(text) : undefined) as T
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

// First meaningful line of a GraphQL document, for readable log labels.
function opLabel(query: string): string {
  return query.trim().split('\n')[0].slice(0, 80)
}

export async function graphqlRequest<T>(
  baseUrl: string,
  query: string,
  variables?: object,
): Promise<T> {
  dlog(`GraphQL → ${baseUrl}/graphql`, { op: opLabel(query), variables: redact(JSON.stringify(variables ?? {})) })
  const res = await request<GraphQLResponse<T>>(`${baseUrl}/graphql`, {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  })
  if (res.errors && res.errors.length > 0) {
    dlog(`GraphQL ✗ ${opLabel(query)} — errors:`, res.errors)
    throw new Error(res.errors.map(e => e.message).join('; '))
  }
  if (!res.data) {
    dlog(`GraphQL ✗ ${opLabel(query)} — 200 but no \`data\` field (empty/partial response)`, res)
    throw new Error('Leere GraphQL-Antwort')
  }
  return res.data
}
