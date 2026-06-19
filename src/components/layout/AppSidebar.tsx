import { useState } from 'react'
import { MessageSquare, LogOut, Lightbulb, UserCog, Plus } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { UserRole } from '../../types'
import Avatar from '../common/Avatar'
import CreateIssueModal from '../modals/CreateIssueModal'
import EditProfileModal from '../modals/EditProfileModal'
import CreateSpaceModal from '../modals/CreateSpaceModal'

// Roles allowed to create a new space. plan.md restricts space creation to
// `admin`; issue #1 additionally names "Chefs und Moderatoren". There is no
// dedicated role for either, so `channel-admin` (Abteilungsleiter ≈ "Chef")
// is included as the closest match; "Moderator" has no role equivalent yet.
// Kept as a single editable list so the gating can be adjusted in one place.
const SPACE_CREATE_ROLES: UserRole[] = ['admin', 'channel-admin']

export default function AppSidebar() {
  const { currentUser, spaces, activeSpaceId, setActiveSpace, logout } = useApp()
  const [showCreateIssueModal, setShowCreateIssueModal] = useState(false)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false)

  const canCreateSpace = !!currentUser?.roles.some(r => SPACE_CREATE_ROLES.includes(r))

  const isActive = (id: string | null) => activeSpaceId === id

  function NavButton({ active, title, onClick, children }: {
    active: boolean; title: string; onClick: () => void; children: React.ReactNode
  }) {
    return (
      <div className="relative flex items-center">
        {/* Active indicator pill */}
        <span className={`absolute -left-3 rounded-r-full transition-all duration-200
          ${active ? 'w-1 h-9 bg-discord-blurple' : 'w-1 h-4 bg-white/20 opacity-0 group-hover:opacity-100'}`}
        />
        <button
          title={title}
          onClick={onClick}
          className={`group w-12 h-12 flex items-center justify-center cursor-pointer transition-all duration-200
            ${active
              ? 'bg-discord-blurple rounded-2xl shadow-amber-glow'
              : 'bg-discord-channels hover:bg-discord-blurple/90 rounded-3xl hover:rounded-2xl'
            }`}
        >
          {children}
          {/* Tooltip */}
          <span className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-discord-channels border border-white/10 text-discord-text text-xs px-2.5 py-1 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 z-50 transition-opacity shadow-lg">
            {title}
          </span>
        </button>
      </div>
    )
  }

  return (
    <>
    <aside className="w-[72px] flex flex-col items-center py-3 gap-2 overflow-y-auto flex-shrink-0"
           style={{ background: 'linear-gradient(to bottom, #05060E, #07091A)' }}>

      {/* DM Button */}
      <NavButton active={isActive(null)} title="Direktnachrichten" onClick={() => setActiveSpace(null)}>
        <MessageSquare
          size={22}
          className={`transition-colors ${isActive(null) ? 'text-discord-sidebar' : 'text-discord-text'}`}
        />
      </NavButton>

      {/* Separator */}
      <div className="w-8 h-px my-1" style={{ background: 'rgba(255,255,255,0.07)' }} />

      {/* Spaces */}
      {spaces.map(space => (
        <NavButton
          key={space.id}
          active={isActive(space.id)}
          title={space.name}
          onClick={() => setActiveSpace(space.id)}
        >
          <span className={`font-display font-bold text-sm transition-colors
            ${isActive(space.id) ? 'text-discord-sidebar' : 'text-discord-text'}`}>
            {space.abbreviation}
          </span>
        </NavButton>
      ))}

      {/* Create space — only visible to roles allowed to create spaces */}
      {canCreateSpace && (
        <NavButton active={false} title="Space erstellen" onClick={() => setShowCreateSpaceModal(true)}>
          <Plus size={22} className="text-discord-green" />
        </NavButton>
      )}

      {/* Bottom: user + logout */}
      <div className="mt-auto flex flex-col items-center gap-2.5">
        {currentUser && (
          <button
            className="text-discord-muted hover:text-discord-blurple transition-colors"
            title="Profil bearbeiten"
            onClick={() => setShowEditProfileModal(true)}
          >
            <UserCog size={17} />
          </button>
        )}
        {currentUser && (
          <button
            className="text-discord-muted hover:text-discord-blurple transition-colors"
            title="Fehler/Verbesserung melden"
            onClick={() => setShowCreateIssueModal(true)}
          >
            <Lightbulb size={17} />
          </button>
        )}
        <button
          className="text-discord-muted hover:text-discord-red transition-colors"
          title="Abmelden"
          onClick={logout}
        >
          <LogOut size={17} />
        </button>
        {currentUser && (
          <div className="relative group cursor-pointer" title={currentUser.displayName}>
            <Avatar user={currentUser} size={34} />
          </div>
        )}
      </div>
    </aside>
    <CreateIssueModal isOpen={showCreateIssueModal} onClose={() => setShowCreateIssueModal(false)} />
    <EditProfileModal isOpen={showEditProfileModal} onClose={() => setShowEditProfileModal(false)} />
    <CreateSpaceModal isOpen={showCreateSpaceModal} onClose={() => setShowCreateSpaceModal(false)} />
    </>
  )
}
