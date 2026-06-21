import { useState } from 'react'
import { Hash, Volume2, Video, BookOpen, HelpCircle, Megaphone, Presentation, Rocket,
         Phone, VideoIcon, Users, UserCog, Search, Lock } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import ChannelMembersModal from '../modals/ChannelMembersModal'
import type { ChannelType } from '../../types'

const CHANNEL_ICON: Record<ChannelType, React.ReactNode> = {
  text:         <Hash size={18} className="text-discord-muted" />,
  announcement: <Megaphone size={18} className="text-discord-muted" />,
  forum:        <BookOpen size={18} className="text-discord-muted" />,
  faq:          <HelpCircle size={18} className="text-discord-muted" />,
  onboarding:   <Rocket size={18} className="text-discord-muted" />,
  voice:        <Volume2 size={18} className="text-discord-muted" />,
  video:        <Video size={18} className="text-discord-muted" />,
  stage:        <Presentation size={18} className="text-discord-muted" />,
}

const TYPE_LABEL: Partial<Record<ChannelType, string>> = {
  announcement: 'Ankündigung',
  forum:        'Forum',
  faq:          'FAQ',
  onboarding:   'Onboarding',
  voice:        'Sprachraum',
  video:        'Videoraum',
  stage:        'Bühne',
}

export default function TopBar() {
  const { activeChannelId, activeConversationId, activeSpaceId,
          getChannel, getConversation, users, currentUser,
          showUserList, toggleUserList } = useApp()
  const [membersChannelId, setMembersChannelId] = useState<string | null>(null)

  const iconBtn = 'w-8 h-8 rounded-lg flex items-center justify-center text-discord-muted hover:text-discord-text hover:bg-discord-hover transition-all duration-150 cursor-pointer'

  const barBase = 'h-12 flex items-center px-4 gap-3 flex-shrink-0'
  const barStyle: React.CSSProperties = {
    background: '#070919',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    boxShadow: '0 1px 0 rgba(0,0,0,0.4)',
  }

  // ─── DM TopBar ───────────────────────────────────────────────────────────────
  if (!activeSpaceId && activeConversationId) {
    const conv = getConversation(activeConversationId)
    if (!conv) return null
    const otherId = conv.participantIds.find(id => id !== currentUser?.id)
    const other = otherId ? users.find(u => u.id === otherId) : undefined
    const name = conv.isGroup
      ? conv.name ?? 'Gruppe'
      : (other?.displayName ?? conv.partnerName ?? 'Chat')

    return (
      <header className={barBase} style={barStyle}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-discord-blurple font-bold text-base">@</span>
          <span className="font-display font-bold text-white text-sm truncate">{name}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={iconBtn} title="Anruf starten"><Phone size={17} /></span>
          <span className={iconBtn} title="Videoanruf"><VideoIcon size={17} /></span>
          <span className={iconBtn} title="Suchen"><Search size={17} /></span>
          <button
            className={`${iconBtn} ${showUserList ? 'text-discord-blurple bg-discord-active' : ''}`}
            onClick={toggleUserList} title="Mitglieder"
          >
            <Users size={17} />
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
    const typeLabel = TYPE_LABEL[ch.type]

    return (
      <>
      <header className={barBase} style={barStyle}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {CHANNEL_ICON[ch.type]}
          <span className="font-display font-bold text-white text-sm truncate">{ch.name}</span>
          {ch.isEncrypted && <span title="E2E verschlüsselt"><Lock size={11} className="text-discord-muted flex-shrink-0" /></span>}
          {typeLabel && (
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-discord-muted bg-discord-hover px-2 py-0.5 rounded-md flex-shrink-0">
              {typeLabel}
            </span>
          )}
          {ch.description && (
            <>
              <div className="w-px h-3.5 bg-discord-muted/30 mx-1 flex-shrink-0 hidden md:block" />
              <span className="text-discord-muted text-xs truncate hidden md:block">{ch.description}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          {showCallIcons && <span className={iconBtn} title="Beitreten"><Phone size={17} /></span>}
          {(ch.type === 'video' || ch.type === 'stage') && (
            <span className={iconBtn} title="Mit Video"><VideoIcon size={17} /></span>
          )}
          <span className={iconBtn} title="Suchen"><Search size={17} /></span>
          <button
            className={iconBtn}
            onClick={() => setMembersChannelId(ch.id)} title="Mitglieder verwalten"
          >
            <UserCog size={17} />
          </button>
          <button
            className={`${iconBtn} ${showUserList ? 'text-discord-blurple bg-discord-active' : ''}`}
            onClick={toggleUserList} title="Mitglieder"
          >
            <Users size={17} />
          </button>
        </div>
      </header>
      {membersChannelId && (
        <ChannelMembersModal
          channelId={membersChannelId}
          isOpen={!!membersChannelId}
          onClose={() => setMembersChannelId(null)}
        />
      )}
      </>
    )
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────
  return (
    <header className={barBase} style={barStyle}>
      <span className="text-discord-muted text-sm">Wähle einen Channel oder eine Konversation</span>
    </header>
  )
}
