import { MessageSquare, Settings } from 'lucide-react'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'

export default function AppSidebar() {
  const { currentUser, spaces, activeSpaceId, setActiveSpace, logout } = useApp()

  const navBtn = (active: boolean) =>
    `relative w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-150 hover:rounded-xl group
     ${active ? 'bg-discord-blurple rounded-xl' : 'bg-discord-channels hover:bg-discord-blurple'}`

  return (
    <aside className="w-[72px] bg-discord-sidebar flex flex-col items-center py-3 gap-2 overflow-y-auto flex-shrink-0">
      {/* DM Button */}
      <div className="relative">
        {activeSpaceId === null && (
          <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
        )}
        <button
          className={navBtn(activeSpaceId === null)}
          title="Direktnachrichten"
          onClick={() => setActiveSpace(null)}
        >
          <MessageSquare size={24} className="text-white" />
        </button>
      </div>

      {/* Separator */}
      <div className="w-8 h-px bg-white/10 my-1" />

      {/* Spaces */}
      {spaces.map(space => (
        <div key={space.id} className="relative">
          {activeSpaceId === space.id && (
            <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
          )}
          <button
            className={navBtn(activeSpaceId === space.id)}
            title={space.name}
            onClick={() => setActiveSpace(space.id)}
          >
            <span className="text-white font-bold text-sm">{space.abbreviation}</span>
          </button>
          {/* Tooltip */}
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 z-50 transition-opacity">
            {space.name}
          </div>
        </div>
      ))}

      {/* Bottom: user + settings */}
      <div className="mt-auto flex flex-col items-center gap-2">
        <button className="hover:opacity-80 transition-opacity" title="Einstellungen" onClick={logout}>
          <Settings size={20} className="text-discord-muted hover:text-discord-text" />
        </button>
        {currentUser && (
          <div title={`${currentUser.displayName} — Abmelden`}>
            <Avatar user={currentUser} size={32} />
          </div>
        )}
      </div>
    </aside>
  )
}
