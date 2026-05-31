import type { Message, User } from '../../types'
import Avatar from '../common/Avatar'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  message: Message
  author: User | undefined
  isMine: boolean
  showAvatar: boolean
}

export default function MessageBubble({ message, author, isMine, showAvatar }: Props) {
  const name = author?.displayName ?? 'Unbekannt'

  return (
    <div className={`flex items-start gap-3 px-4 py-0.5 hover:bg-white/5 group ${isMine ? 'flex-row-reverse' : ''}`}>
      {/* Avatar placeholder to keep alignment */}
      <div className="w-10 flex-shrink-0 flex justify-center pt-0.5">
        {showAvatar && author ? (
          <Avatar user={author} size={40} showStatus={false} />
        ) : null}
      </div>

      <div className={`flex flex-col max-w-[70%] ${isMine ? 'items-end' : 'items-start'}`}>
        {showAvatar && (
          <div className={`flex items-baseline gap-2 mb-0.5 ${isMine ? 'flex-row-reverse' : ''}`}>
            <span className={`text-sm font-semibold ${isMine ? 'text-discord-blurple' : 'text-white'}`}>{name}</span>
            <span className="text-xs text-discord-muted opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTime(message.createdAt)}
            </span>
          </div>
        )}
        <div className={`px-3 py-2 rounded-2xl text-sm text-discord-text break-words whitespace-pre-wrap
          ${isMine
            ? 'bg-discord-blurple text-white rounded-br-sm'
            : 'bg-discord-input rounded-bl-sm'
          }`}
        >
          {message.body}
        </div>
        {!showAvatar && (
          <span className="text-xs text-discord-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>
    </div>
  )
}
