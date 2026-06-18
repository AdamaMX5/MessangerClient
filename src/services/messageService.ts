import { request } from './httpClient'

const BASE = import.meta.env.VITE_MESSAGE_SERVICE_URL ?? 'https://message.freischule.info'

// Raw message as returned by the MessageService. Field names may be nested
// differently in practice; callers should treat this shape defensively.
export interface ServiceMessage {
  id: string
  senderId: string
  recipientId: string
  body: string
  readAt: string | null
  createdAt: string
}

interface Paged<T> {
  // The service may return a bare array or wrap it in a `messages`/`data` field.
  messages?: T[]
  data?: T[]
}

// Normalize a paged response into a plain array regardless of envelope shape.
function toArray<T>(res: T[] | Paged<T>): T[] {
  if (Array.isArray(res)) return res
  return res.messages ?? res.data ?? []
}

export const messageService = {
  async send(recipientId: string, body: string): Promise<ServiceMessage> {
    return request<ServiceMessage>(`${BASE}/messages`, {
      method: 'POST',
      body: JSON.stringify({ recipientId, body }),
    })
  },

  async getUnreadCount(): Promise<number> {
    const res = await request<{ count: number }>(`${BASE}/messages/unread-count`)
    return res.count
  },

  async getInbox(page = 1, limit = 100, unreadOnly = false): Promise<ServiceMessage[]> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (unreadOnly) params.set('unreadOnly', 'true')
    const res = await request<ServiceMessage[] | Paged<ServiceMessage>>(
      `${BASE}/messages/inbox?${params.toString()}`,
    )
    return toArray(res)
  },

  async getSent(page = 1, limit = 100): Promise<ServiceMessage[]> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await request<ServiceMessage[] | Paged<ServiceMessage>>(
      `${BASE}/messages/sent?${params.toString()}`,
    )
    return toArray(res)
  },

  async getConversation(userId: string, page = 1, limit = 100): Promise<ServiceMessage[]> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    const res = await request<ServiceMessage[] | Paged<ServiceMessage>>(
      `${BASE}/messages/conversation/${userId}?${params.toString()}`,
    )
    return toArray(res)
  },

  async markRead(messageId: string): Promise<void> {
    await request<void>(`${BASE}/messages/${messageId}/read`, { method: 'PATCH' })
  },

  async markAllRead(senderId: string): Promise<void> {
    await request<void>(`${BASE}/messages/read-all`, {
      method: 'PATCH',
      body: JSON.stringify({ senderId }),
    })
  },

  async deleteMessage(messageId: string): Promise<void> {
    await request<void>(`${BASE}/messages/${messageId}`, { method: 'DELETE' })
  },
}
