import { ChevronRight, Hash, Volume2, Video, BookOpen, HelpCircle, Megaphone, Presentation, Rocket, Plus } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'
import type { ChannelType, Conversation } from '../../types'

const CHANNEL_ICON: Record<ChannelType, React.ReactNode> = {
  text:         <Hash size={14} />,
  announcement: <Megaphone size={14} />,
  forum:        <BookOpen size={14} />,
  faq:          <HelpCircle size={14} />,
  onboarding:   <Rocket size={14} />,
  voice:        <Volume2 size={14} />,
  video:        <Video size={14} />,
  stage:        <Presentation size={14} />,
}

function ConversationItem({ conv, active, onClick }: {
  conv: Conversation; active: boolean; onClick: () => void
}) {
  const { users, currentUser } = useApp()
  const otherId = conv.participantIds.find(id => id !== currentUser?.id)
  const other = otherId ? users.find(u => u.id === otherId) : undefined

  const name = conv.isGroup ? conv.name ?? 'Gruppe' : (other?.displayName ?? 'Unbekannt')
  const lastMsg = conv.messages.at(-1)
  const preview = lastMsg ? lastMsg.body.slice(0, 32) + (lastMsg.body.length > 32 ? '…' : '') : ''

  return (
    <button
      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all duration-150 text-left group
        ${active
          ? 'bg-discord-active text-white'
          : 'hover:bg-discord-hover text-discord-muted hover:text-discord-text'
        }`}
      onClick={onClick}
    >
      {conv.isGroup ? (
        <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center flex-shrink-0 text-xs font-bold"
             style={{ color: '#05060E' }}>
          {name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}
        </div>
      ) : other ? (
        <Avatar user={other} size={32} />
      ) : null}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-semibold truncate">{name}</span>
          {conv.unreadCount > 0 && (
            <span className="bg-discord-blurple text-discord-sidebar text-xs rounded-full px-1.5 min-w-[18px] text-center flex-shrink-0 font-bold leading-5"
                  style={{ fontSize: '10px' }}>
              {conv.unreadCount}
            </span>
          )}
        </div>
        {preview && <p className="text-xs text-discord-muted truncate leading-4">{preview}</p>}
      </div>
    </button>
  )
}

function UserFooter() {
  const { currentUser } = useApp()
  if (!currentUser) return null
  return (
    <div className="px-3 py-2.5 flex items-center gap-2.5"
         style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#05060E' }}>
      <Avatar user={currentUser} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate leading-4">{currentUser.displayName}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-discord-green animate-pulse-dot" />
          <span className="text-xs text-discord-muted">Online</span>
        </div>
      </div>
    </div>
  )
}

export default function ChannelSidebar() {
  const { spaces, conversations, activeSpaceId, activeChannelId, activeConversationId,
          setActiveChannel, setActiveConversation } = useApp()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const toggleCat = (id: string) => setCollapsed(p => ({ ...p, [id]: !p[id] }))

  // ─── DM mode ─────────────────────────────────────────────────────────────────
  if (!activeSpaceId) {
    return (
      <aside className="w-60 flex flex-col flex-shrink-0" style={{ background: '#0A0D1D', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 className="font-display font-bold text-white text-sm tracking-tight">Direktnachrichten</h2>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <span className="text-[10px] font-bold text-discord-muted uppercase tracking-widest">Nachrichten</span>
            <button className="text-discord-muted hover:text-discord-text transition-colors" title="Neue DM">
              <Plus size={13} />
            </button>
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

        <UserFooter />
      </aside>
    )
  }

  // ─── Space mode ───────────────────────────────────────────────────────────────
  const space = spaces.find(s => s.id === activeSpaceId)
  if (!space) return null

  return (
    <aside className="w-60 flex flex-col flex-shrink-0" style={{ background: '#0A0D1D', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
      {/* Space header */}
      <div className="px-4 py-3.5 flex items-center justify-between cursor-pointer hover:bg-discord-hover transition-colors"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h2 className="font-display font-bold text-white text-sm truncate tracking-tight">{space.name}</h2>
        <ChevronRight size={14} className="text-discord-muted flex-shrink-0 rotate-90" />
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {space.categories.map(cat => (
          <div key={cat.id} className="mb-2">
            {/* Category header */}
            <button
              className="w-full flex items-center gap-1.5 px-3 py-1 group"
              onClick={() => toggleCat(cat.id)}
            >
              <ChevronRight
                size={10}
                className={`text-discord-muted transition-transform flex-shrink-0 ${collapsed[cat.id] ? '' : 'rotate-90'}`}
              />
              <span className="text-[10px] font-bold text-discord-muted uppercase tracking-widest truncate group-hover:text-discord-text transition-colors">
                {cat.name}
              </span>
              <Plus size={11} className="ml-auto opacity-0 group-hover:opacity-100 text-discord-muted hover:text-discord-text transition-all flex-shrink-0" />
            </button>

            {/* Channels */}
            {!collapsed[cat.id] && cat.channels.map(ch => {
              const isActive = activeChannelId === ch.id
              const participantCount = ch.voiceParticipantIds?.length ?? 0
              return (
                <div key={ch.id}>
                  <button
                    className={`w-full flex items-center gap-2 py-1 mx-2 rounded-md text-sm transition-all duration-150 text-left group/ch relative
                      ${isActive
                        ? 'bg-discord-active text-white'
                        : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
                      }`}
                    style={{
                      width: 'calc(100% - 16px)',
                      paddingLeft: '8px', paddingRight: '8px',
                      ...(isActive ? { borderLeft: '2px solid #F5A825', paddingLeft: '6px' } : {}),
                    }}
                    onClick={() => setActiveChannel(ch.id)}
                  >
                    <span className={`flex-shrink-0 ${isActive ? 'text-discord-blurple' : 'text-discord-muted group-hover/ch:text-discord-text'}`}>
                      {CHANNEL_ICON[ch.type]}
                    </span>
                    <span className="truncate text-[13px]">{ch.name}</span>
                    <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                      {ch.isEncrypted && <span title="E2E verschlüsselt" className="text-discord-muted text-[10px]">🔒</span>}
                      {ch.isPublic && <span title="Öffentlich" className="text-discord-green text-[10px]">🌐</span>}
                    </div>
                  </button>

                  {/* Voice participants */}
                  {(ch.type === 'voice' || ch.type === 'video' || ch.type === 'stage') && participantCount > 0 && (
                    <div className="ml-7 mt-0.5 space-y-0.5">
                      {ch.voiceParticipantIds!.map(uid => (
                        <div key={uid} className="flex items-center gap-1.5 px-2 py-0.5 text-xs text-discord-muted">
                          <Volume2 size={9} className="text-discord-green flex-shrink-0" />
                          <span className="truncate">{uid}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <UserFooter />
    </aside>
  )
}
