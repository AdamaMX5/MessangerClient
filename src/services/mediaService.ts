import { request } from './httpClient'
import { getAccessToken } from './tokenStore'

const BASE = import.meta.env.VITE_MEDIA_SERVICE_URL ?? 'https://media.freischule.info'
const APP_NAME = 'MessangerClient'

export interface MediaDocument {
  id: string
  url: string
}

export interface BrowseResult {
  path: string
  folders: string[]
  files: MediaDocument[]
}

export interface UploadOptions {
  folder?: string
  name?: string
  description?: string
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json()
    if (data && typeof data.message === 'string') return data.message
    if (data && typeof data.error === 'string') return data.error
  } catch {
    // response had no JSON body
  }
  return `${fallback} (HTTP ${res.status})`
}

export const mediaService = {
  // Uploads via raw fetch (not httpClient) so the browser sets the multipart
  // Content-Type with boundary itself — manually setting it would break parsing.
  async upload(file: File, opts: UploadOptions = {}): Promise<MediaDocument> {
    const form = new FormData()
    form.append('file', file)
    form.append('app_name', APP_NAME)
    if (opts.folder) form.append('folder', opts.folder)
    if (opts.name) form.append('name', opts.name)
    if (opts.description) form.append('description', opts.description)

    const headers: Record<string, string> = {}
    const token = getAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`

    let res: Response
    try {
      res = await fetch(`${BASE}/upload`, { method: 'POST', headers, body: form })
    } catch {
      throw new Error('Upload fehlgeschlagen (Netzwerkfehler).')
    }
    if (!res.ok) {
      throw new Error(await errorMessage(res, 'Upload fehlgeschlagen'))
    }
    return res.json()
  },

  getMedia(id: string): Promise<MediaDocument> {
    return request<MediaDocument>(`${BASE}/media/${id}`)
  },

  deleteMedia(id: string): Promise<void> {
    return request<void>(`${BASE}/media/${id}`, { method: 'DELETE' })
  },

  browse(appName: string, path?: string): Promise<BrowseResult> {
    const suffix = path ? `/${path}` : ''
    return request<BrowseResult>(`${BASE}/browse/${appName}${suffix}`)
  },
}
