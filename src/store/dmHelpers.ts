import type { Conversation, Message } from '../types'
import type { ServiceMessage } from '../services/messageService'

// In the 1:1 DM world the conversation id is simply the other user's id, and we
// reuse the UI Message.channelId field to carry that same conversation id so the
// existing chat components keep working unchanged.
export function toUiMessage(sm: ServiceMessage, conversationId: string): Message {
  return {
    id: sm.id,
    senderId: sm.senderId,
    channelId: conversationId,
    body: sm.body,
    createdAt: sm.createdAt,
    readAt: sm.readAt ?? null,
  }
}

function otherUserId(sm: ServiceMessage, currentUserId: string): string {
  return sm.senderId === currentUserId ? sm.recipientId : sm.senderId
}

// Derive 1:1 conversation stubs from the union of inbox + sent messages.
// Groups the latest message per partner and counts unread inbox entries.
export function deriveConversations(
  inbox: ServiceMessage[],
  sent: ServiceMessage[],
  currentUserId: string,
): Conversation[] {
  const byPartner = new Map<string, { last: ServiceMessage; unread: number }>()

  for (const sm of [...inbox, ...sent]) {
    const partner = otherUserId(sm, currentUserId)
    const entry = byPartner.get(partner)
    const isUnreadInbox = sm.senderId !== currentUserId && !sm.readAt
    if (!entry) {
      byPartner.set(partner, { last: sm, unread: isUnreadInbox ? 1 : 0 })
      continue
    }
    if (new Date(sm.createdAt) > new Date(entry.last.createdAt)) entry.last = sm
    if (isUnreadInbox) entry.unread += 1
  }

  return Array.from(byPartner.entries())
    .map(([partnerId, { last, unread }]) => buildConversation(partnerId, last, unread, currentUserId))
    .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
}

// Append a message to an existing conversation, or create a new 1:1
// conversation if none exists yet (e.g. first message to a fresh partner).
export function upsertConversationMessage(
  conversations: Conversation[],
  partnerId: string,
  currentUserId: string,
  message: Message,
): Conversation[] {
  if (conversations.some(c => c.id === partnerId)) {
    return conversations.map(c => c.id === partnerId
      ? { ...c, messages: [...c.messages, message], lastMessageAt: message.createdAt }
      : c)
  }
  const fresh: Conversation = {
    id: partnerId,
    participantIds: [currentUserId, partnerId],
    messages: [message],
    unreadCount: 0,
    isGroup: false,
    lastMessageAt: message.createdAt,
  }
  return [fresh, ...conversations]
}

// Build a UI Message with a generated id/createdAt for optimistic sends.
export function buildMessage(senderId: string, channelId: string, body: string): Message {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    senderId,
    channelId,
    body,
    createdAt: new Date().toISOString(),
    readAt: null,
  }
}

function buildConversation(
  partnerId: string,
  last: ServiceMessage,
  unread: number,
  currentUserId: string,
): Conversation {
  return {
    id: partnerId,
    participantIds: [currentUserId, partnerId],
    messages: [toUiMessage(last, partnerId)],
    unreadCount: unread,
    isGroup: false,
    lastMessageAt: last.createdAt,
  }
}
