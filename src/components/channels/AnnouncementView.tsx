import { Megaphone } from 'lucide-react'
import type { Channel } from '../../types'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AnnouncementView({ channel }: { channel: Channel }) {
  const { getUser } = useApp()

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      <div className="flex items-center gap-2.5 mb-6">
        <Megaphone size={20} className="text-discord-blurple flex-shrink-0" />
        <h2 className="font-display font-bold text-xl text-white">{channel.name}</h2>
        {channel.description && (
          <span className="text-discord-muted text-sm">— {channel.description}</span>
        )}
      </div>

      {channel.messages.length === 0 && (
        <p className="text-discord-muted text-sm">Noch keine Ankündigungen.</p>
      )}

      {channel.messages.map(msg => {
        const author = getUser(msg.senderId)
        return (
          <div
            key={msg.id}
            className="rounded-xl p-4 border transition-all duration-150 hover:border-white/10"
            style={{ background: '#0A0D1D', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              {author && <Avatar user={author} size={34} showStatus={false} />}
              <div>
                <span className="text-sm font-semibold text-white">{author?.displayName ?? 'System'}</span>
                <span className="text-xs text-discord-muted ml-2">{formatDateTime(msg.createdAt)}</span>
              </div>
            </div>
            <p className="text-discord-text text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
          </div>
        )
      })}
    </div>
  )
}
