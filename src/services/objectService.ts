import { request } from './httpClient'

const BASE = import.meta.env.VITE_OBJECT_SERVICE_URL ?? 'https://object.freischule.info'

// Generic stored object envelope returned by the ObjectService. `data` carries
// the collection-specific payload; metadata fields are managed by the service.
export interface StoredObject<T> {
  id: string
  collectionName: string
  isPublic: boolean
  app?: string
  tags?: string[]
  createdBy?: string
  updatedBy?: string
  createdAt: string
  updatedAt: string
  data: T
  refs?: Record<string, string>
}

interface ListQuery {
  page?: number
  limit?: number
  isPublic?: boolean
  app?: string
  tags?: string[]
  // Reference filters → serialized as ref[key]=value query params.
  ref?: Record<string, string>
}

interface WriteBody<T> {
  data?: Partial<T>
  refs?: Record<string, string>
  isPublic?: boolean
  app?: string
  tags?: string[]
  // PATCH only: true = shallow merge into existing `data`, false/absent = replace.
  merge?: boolean
}

// The list endpoint may return a bare array or wrap it in a `data`/`items` field.
interface Paged<T> {
  data?: T[]
  items?: T[]
}

function toArray<T>(res: T[] | Paged<T>): T[] {
  if (Array.isArray(res)) return res
  return res.data ?? res.items ?? []
}

function buildQuery(query: ListQuery = {}): string {
  const params = new URLSearchParams()
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.limit !== undefined) params.set('limit', String(query.limit))
  if (query.isPublic !== undefined) params.set('isPublic', String(query.isPublic))
  if (query.app) params.set('app', query.app)
  if (query.tags?.length) params.set('tags', query.tags.join(','))
  for (const [key, value] of Object.entries(query.ref ?? {})) {
    params.set(`ref[${key}]`, value)
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export const objectService = {
  async list<T>(collection: string, query?: ListQuery): Promise<StoredObject<T>[]> {
    const res = await request<StoredObject<T>[] | Paged<StoredObject<T>>>(
      `${BASE}/objects/${collection}${buildQuery(query)}`,
    )
    return toArray(res)
  },

  get<T>(collection: string, id: string): Promise<StoredObject<T>> {
    return request<StoredObject<T>>(`${BASE}/objects/${collection}/${id}`)
  },

  create<T>(collection: string, body: WriteBody<T>): Promise<StoredObject<T>> {
    return request<StoredObject<T>>(`${BASE}/objects/${collection}`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  patch<T>(collection: string, id: string, body: WriteBody<T>): Promise<StoredObject<T>> {
    return request<StoredObject<T>>(`${BASE}/objects/${collection}/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  put<T>(collection: string, id: string, body: WriteBody<T>): Promise<StoredObject<T>> {
    return request<StoredObject<T>>(`${BASE}/objects/${collection}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  async remove(collection: string, id: string): Promise<void> {
    await request<void>(`${BASE}/objects/${collection}/${id}`, { method: 'DELETE' })
  },
}
