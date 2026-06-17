import { getAccessToken } from './tokenStore'

const BASE = import.meta.env.VITE_GIT_SERVICE_URL ?? 'https://git.freischule.info'

export interface GitRepo {
  name: string
  fullName: string
  url: string
}

export interface CreateIssueInput {
  repo: string
  title: string
  body: string
  labels?: string[]
}

export interface CreateIssueResult {
  number: number
  url: string
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
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

export const gitService = {
  async getRepos(): Promise<GitRepo[]> {
    let res: Response
    try {
      res = await fetch(`${BASE}/repos`, { headers: authHeaders() })
    } catch {
      throw new Error('Repository-Liste konnte nicht geladen werden (Netzwerkfehler).')
    }
    if (!res.ok) {
      throw new Error(await errorMessage(res, 'Repository-Liste konnte nicht geladen werden'))
    }
    return res.json()
  },

  async createIssue(input: CreateIssueInput): Promise<CreateIssueResult> {
    let res: Response
    try {
      res = await fetch(`${BASE}/issue`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(input),
      })
    } catch {
      throw new Error('Issue konnte nicht erstellt werden (Netzwerkfehler).')
    }
    if (!res.ok) {
      throw new Error(await errorMessage(res, 'Issue konnte nicht erstellt werden'))
    }
    return res.json()
  },
}
