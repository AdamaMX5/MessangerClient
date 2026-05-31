import { ChevronDown, Hash, Volume2, Video, BookOpen, HelpCircle, Megaphone, Presentation, Rocket, Plus, Star } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'
import type { ChannelType, Conversation } from '../../types'

const CHANNEL_ICON: Record<ChannelType, React.ReactNode> = {
  text:         <Hash size={16} />,
  announcement: <Megaphone size={16} />,
  forum:        <BookOpen size={16} />,
  faq:          <HelpCircle size={16} />,
  onboarding:   <Rocket size={16} />,
  voice:        <Volume2 size={16} />,
  video:        <Video size={16} />,
  stage:        <Presentation size={16} />,
}

function ConversationItem({ conv, active, onClick }: {
  conv: Conversation; active: boolean; onClick: () => void
}) {
  const { users, currentUser } = useApp()
  const otherId = conv.participantIds.find(id => id !== currentUser?.id)
  const other = otherId ? users.find(u => u.id === otherId) : undefined

  const name = conv.isGroup ? conv.name ?? 'Gruppe' : (other?.displayName ?? 'Unbekannt')
  const lastMsg = conv.messages.at(-1)
  const preview = lastMsg ? lastMsg.body.slice(0, 35) + (lastMsg.body.length > 35 ? '…' : '') : ''

  return (
    <button
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors text-left group
        ${active ? 'bg-discord-active text-white' : 'hover:bg-discord-hover text-discord-muted hover:text-discord-text'}`}
      onClick={onClick}
    >
      {conv.isGroup ? (
        <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center flex-shrink-0 text-xs text-white font-bold">
          {name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
        </div>
      ) : other ? (
        <Avatar user={other} size={32} />
      ) : null}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium truncate">{name}</span>
          {conv.unreadCount > 0 && (
            <span className="ml-1 bg-discord-red text-white text-xs rounded-full px-1.5 min-w-[18px] text-center flex-shrink-0">
              {conv.unreadCount}
            </span>
          )}
        </div>
        {preview && <p className="text-xs text-discord-muted truncate">{preview}</p>}
      </div>
    </button>
  )
}

export default function ChannelSidebar() {
  const { spaces, conversations, activeSpaceId, activeChannelId, activeConversationId,
          setActiveChannel, setActiveConversation, currentUser } = useApp()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCat = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }))

  // ─── DM mode ─────────────────────────────────────────────────────────────────
  if (!activeSpaceId) {
    return (
      <aside className="w-60 bg-discord-channels flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-black/20 shadow-sm">
          <h2 className="font-semibold text-white text-sm">Direktnachrichten</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <div className="flex items-center justify-between px-2 py-1 mb-1">
            <span className="text-xs font-semibold text-discord-muted uppercase">Nachrichten</span>
            <button className="text-discord-muted hover:text-discord-text" title="Neue DM"><Plus size={14} /></button>
          </div>
          {conversations.map(conv => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              active={activeConversationId === conv.id}
              onClick={() => setActiveConversation(conv.id)}
            />
          ))}
        </div>
        {/* Current user footer */}
        {currentUser && (
          <div className="px-2 py-2 bg-discord-sidebar flex items-center gap-2">
            <Avatar user={currentUser} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentUser.displayName}</p>
              <p className="text-xs text-discord-muted">Online</p>
            </div>
          </div>
        )}
      </aside>
    )
  }

  // ─── Space mode ───────────────────────────────────────────────────────────────
  const space = spaces.find(s => s.id === activeSpaceId)
  if (!space) return null

  return (
    <aside className="w-60 bg-discord-channels flex flex-col flex-shrink-0">
      {/* Space header */}
      <div className="px-4 py-3 border-b border-black/20 shadow-sm flex items-center justify-between cursor-pointer hover:bg-discord-hover">
        <h2 className="font-bold text-white text-sm truncate">{space.name}</h2>
        <ChevronDown size={16} className="text-discord-muted flex-shrink-0" />
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {space.categories.map(cat => (
          <div key={cat.id} className="mb-1">
            {/* Category header */}
            <button
              className="w-full flex items-center gap-1 px-2 py-1 text-xs font-semibold text-discord-muted uppercase hover:text-discord-text transition-colors"
              onClick={() => toggleCat(cat.id)}
            >
              <ChevronDown
                size={12}
                className={`transition-transform ${collapsed[cat.id] ? '-rotate-90' : ''}`}
              />
              {cat.name}
              <Plus size={12} className="ml-auto opacity-0 group-hover:opacity-100 hover:text-white" />
            </button>

            {/* Channels */}
            {!collapsed[cat.id] && cat.channels.map(ch => {
              const isActive = activeChannelId === ch.id
              const participantCount = ch.voiceParticipantIds?.length ?? 0
              return (
                <div key={ch.id}>
                  <button
                    className={`w-full flex items-center gap-1.5 px-2 py-1 mx-1 rounded text-sm transition-colors text-left
                      ${isActive ? 'bg-discord-active text-white' : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'}`}
                    style={{ width: 'calc(100% - 8px)' }}
                    onClick={() => setActiveChannel(ch.id)}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-discord-muted'}`}>
                      {CHANNEL_ICON[ch.type]}
                    </span>
                    <span className="truncate">{ch.name}</span>
                    {ch.isEncrypted && (
                      <span className="ml-auto flex-shrink-0 text-discord-muted" title="E2E verschlüsselt">🔒</span>
                    )}
                    {ch.isPublic && (
                      <span className="ml-auto flex-shrink-0 text-discord-green" title="Öffentlich">🌐</span>
                    )}
                    {ch.type === 'forum' && (
                      <Star size={11} className="ml-auto flex-shrink-0 text-discord-muted" />
                    )}
                  </button>
                  {/* Voice participants under channel */}
                  {(ch.type === 'voice' || ch.type === 'video' || ch.type === 'stage') && participantCount > 0 && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {ch.voiceParticipantIds!.map(uid => {
                        const u = space.memberIds.includes(uid) ? undefined : undefined
                        return (
                          <div key={uid} className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-discord-muted">
                            <Volume2 size={10} className="text-discord-green flex-shrink-0" />
                            <span className="truncate">{uid}</span>
                          </div>
                        )
                        return u
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Current user footer */}
      {currentUser && (
        <div className="px-2 py-2 bg-discord-sidebar flex items-center gap-2">
          <Avatar user={currentUser} size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{currentUser.displayName}</p>
            <p className="text-xs text-discord-muted">Online</p>
          </div>
        </div>
      )}
    </aside>
  )
}
