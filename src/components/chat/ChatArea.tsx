import { useEffect, useRef } from 'react'
import type { Message, User } from '../../types'
import MessageBubble from './MessageBubble'

function formatDate(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (d.toDateString() === today.toDateString()) return 'Heute'
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern'
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

interface Props {
  messages: Message[]
  currentUserId: string
  getUser: (id: string) => User | undefined
}

export default function ChatArea({ messages, currentUserId, getUser }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-discord-muted text-sm">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-discord-input flex items-center justify-center mx-auto mb-3 opacity-40">
            <span className="font-display font-black text-xl text-discord-text">?</span>
          </div>
          <p>Noch keine Nachrichten. Starte das Gespräch!</p>
        </div>
      </div>
    )
  }

  let lastDate = ''
  let lastSenderId = ''

  return (
    <div className="flex-1 overflow-y-auto py-4 space-y-0.5">
      {messages.map((msg, i) => {
        const msgDate = new Date(msg.createdAt).toDateString()
        const showDate = msgDate !== lastDate
        const showAvatar = showDate || msg.senderId !== lastSenderId

        lastDate = msgDate
        lastSenderId = msg.senderId

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-[11px] font-bold text-discord-muted uppercase tracking-widest px-1">
                  {formatDate(msg.createdAt)}
                </span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            )}
            {showAvatar && i > 0 && !showDate && <div className="h-1.5" />}
            <MessageBubble
              message={msg}
              author={getUser(msg.senderId)}
              isMine={msg.senderId === currentUserId}
              showAvatar={showAvatar}
            />
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
