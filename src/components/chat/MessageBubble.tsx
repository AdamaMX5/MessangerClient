import { Lock } from 'lucide-react'
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

  // Per-message encryption indicator (#12): a small lock next to the timestamp
  // when the message travelled as an E2E envelope. Its absence on an otherwise
  // encrypted channel is the visible signal of a plaintext fallback.
  const lock = message.encrypted
    ? <span title="Ende-zu-Ende verschlüsselt"><Lock size={9} className="text-discord-green inline-block align-middle flex-shrink-0" /></span>
    : null

  return (
    <div className={`flex items-start gap-3 px-4 py-0.5 hover:bg-white/[0.02] group transition-colors ${isMine ? 'flex-row-reverse' : ''}`}>
      {/* Avatar column */}
      <div className="w-9 flex-shrink-0 flex justify-center pt-0.5">
        {showAvatar && author ? (
          <Avatar user={author} size={36} showStatus={false} />
        ) : (
          <span className="text-[10px] text-discord-muted opacity-0 group-hover:opacity-100 transition-opacity pt-1 leading-none flex items-center gap-1">
            {formatTime(message.createdAt)}{lock}
          </span>
        )}
      </div>

      <div className={`flex flex-col max-w-[72%] ${isMine ? 'items-end' : 'items-start'}`}>
        {showAvatar && (
          <div className={`flex items-baseline gap-2 mb-1 ${isMine ? 'flex-row-reverse' : ''}`}>
            <span className={`text-[13px] font-bold leading-none ${isMine ? 'text-discord-blurple' : 'text-white'}`}>
              {name}
            </span>
            <span className="text-[10px] text-discord-muted opacity-0 group-hover:opacity-100 transition-opacity leading-none flex items-center gap-1">
              {formatTime(message.createdAt)}{lock}
            </span>
          </div>
        )}

        <div className={`px-3 py-2 rounded-2xl text-[13px] break-words whitespace-pre-wrap leading-relaxed
          ${isMine
            ? 'bg-discord-blurple rounded-tr-sm'
            : 'bg-discord-input rounded-tl-sm text-discord-text'
          }`}
          style={isMine ? { color: '#05060E' } : undefined}
        >
          {message.body}
        </div>
      </div>
    </div>
  )
}
