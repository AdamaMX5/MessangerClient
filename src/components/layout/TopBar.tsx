import { Hash, Volume2, Video, BookOpen, HelpCircle, Megaphone, Presentation, Rocket,
         Phone, VideoIcon, Users, Search, Lock } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { ChannelType } from '../../types'

const CHANNEL_ICON: Record<ChannelType, React.ReactNode> = {
  text:         <Hash size={20} className="text-discord-muted" />,
  announcement: <Megaphone size={20} className="text-discord-muted" />,
  forum:        <BookOpen size={20} className="text-discord-muted" />,
  faq:          <HelpCircle size={20} className="text-discord-muted" />,
  onboarding:   <Rocket size={20} className="text-discord-muted" />,
  voice:        <Volume2 size={20} className="text-discord-muted" />,
  video:        <Video size={20} className="text-discord-muted" />,
  stage:        <Presentation size={20} className="text-discord-muted" />,
}

export default function TopBar() {
  const { activeChannelId, activeConversationId, activeSpaceId,
          getChannel, getConversation, users, currentUser,
          showUserList, toggleUserList } = useApp()

  const iconBtn = 'text-discord-muted hover:text-discord-text transition-colors cursor-pointer'

  // ─── DM TopBar ───────────────────────────────────────────────────────────────
  if (!activeSpaceId && activeConversationId) {
    const conv = getConversation(activeConversationId)
    if (!conv) return null
    const otherId = conv.participantIds.find(id => id !== currentUser?.id)
    const other = otherId ? users.find(u => u.id === otherId) : undefined
    const name = conv.isGroup ? conv.name ?? 'Gruppe' : (other?.displayName ?? 'Chat')

    return (
      <header className="h-12 bg-discord-chat border-b border-black/20 flex items-center px-4 gap-3 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-discord-muted">@</span>
          <span className="font-semibold text-white truncate">{name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span title="Anruf starten"><Phone size={20} className={iconBtn} /></span>
          <span title="Videoanruf starten"><VideoIcon size={20} className={iconBtn} /></span>
          <span title="Suchen"><Search size={20} className={iconBtn} /></span>
          <button onClick={toggleUserList} title="Mitglieder">
            <Users size={20} className={`${iconBtn} ${showUserList ? 'text-white' : ''}`} />
          </button>
        </div>
      </header>
    )
  }

  // ─── Channel TopBar ───────────────────────────────────────────────────────────
  if (activeChannelId) {
    const ch = getChannel(activeChannelId)
    if (!ch) return null
    const showCallIcons = ch.type === 'voice' || ch.type === 'video' || ch.type === 'stage'

    return (
      <header className="h-12 bg-discord-chat border-b border-black/20 flex items-center px-4 gap-3 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {CHANNEL_ICON[ch.type]}
          <span className="font-semibold text-white truncate">{ch.name}</span>
          {ch.isEncrypted && <span title="E2E verschlüsselt"><Lock size={13} className="text-discord-muted flex-shrink-0" /></span>}
          {ch.description && (
            <>
              <div className="w-px h-4 bg-discord-muted/30 mx-1" />
              <span className="text-discord-muted text-sm truncate hidden md:block">{ch.description}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {showCallIcons && <span title="Beitreten"><Phone size={20} className={iconBtn} /></span>}
          {(ch.type === 'video' || ch.type === 'stage') && (
            <span title="Mit Video beitreten"><VideoIcon size={20} className={iconBtn} /></span>
          )}
          <span title="Suchen"><Search size={20} className={iconBtn} /></span>
          <button onClick={toggleUserList} title="Mitglieder">
            <Users size={20} className={`${iconBtn} ${showUserList ? 'text-white' : ''}`} />
          </button>
        </div>
      </header>
    )
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────
  return (
    <header className="h-12 bg-discord-chat border-b border-black/20 flex items-center px-4 flex-shrink-0 shadow-sm">
      <span className="text-discord-muted text-sm">Wähle einen Channel oder eine Konversation</span>
    </header>
  )
}
