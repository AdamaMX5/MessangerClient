import { getAccessToken } from './tokenStore'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
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

  let res: Response
  try {
    res = await fetch(url, { ...rest, headers: finalHeaders, body })
  } catch {
    throw new Error('Netzwerkfehler')
  }

  if (!res.ok) {
    throw new Error(await errorMessage(res, 'Anfrage fehlgeschlagen'))
  }

  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

interface GraphQLResponse<T> {
  data?: T
  errors?: Array<{ message: string }>
}

export async function graphqlRequest<T>(
  baseUrl: string,
  query: string,
  variables?: object,
): Promise<T> {
  const res = await request<GraphQLResponse<T>>(`${baseUrl}/graphql`, {
    method: 'POST',
    body: JSON.stringify({ query, variables }),
  })
  if (res.errors && res.errors.length > 0) {
    throw new Error(res.errors.map(e => e.message).join('; '))
  }
  if (!res.data) throw new Error('Leere GraphQL-Antwort')
  return res.data
}
