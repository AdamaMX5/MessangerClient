import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'
import type { User } from '../../types'

function UserRow({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-discord-hover cursor-pointer group transition-all duration-150">
      <Avatar user={user} size={30} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-discord-text truncate group-hover:text-white transition-colors leading-4">
          {user.displayName}
        </p>
        <p className="text-[11px] text-discord-muted truncate leading-4">
          {user.roles.includes('customer') ? 'Kunde' : user.roles.includes('admin') ? 'Admin' : user.roles.includes('moderator') ? 'Moderator' : 'Mitarbeiter'}
        </p>
      </div>
    </div>
  )
}

export default function UserListPanel() {
  const { users, spaces, conversations, activeSpaceId, activeConversationId, activeChannelId, getChannel, getConversation } = useApp()

  let memberIds: string[] = []

  if (activeSpaceId) {
    const space = spaces.find(s => s.id === activeSpaceId)
    if (activeChannelId) {
      const ch = getChannel(activeChannelId)
      memberIds = ch?.memberIds ?? space?.memberIds ?? []
    } else {
      memberIds = space?.memberIds ?? []
    }
  } else if (activeConversationId) {
    const conv = getConversation(activeConversationId)
    memberIds = conv?.participantIds ?? []
  } else {
    memberIds = users.map(u => u.id)
  }

  const members = users.filter(u => memberIds.includes(u.id))
  const online  = members.filter(u => u.status === 'online')
  const away    = members.filter(u => u.status === 'away' || u.status === 'dnd')
  const offline = members.filter(u => u.status === 'offline')

  function Section({ title, list }: { title: string; list: User[] }) {
    if (!list.length) return null
    return (
      <div className="mb-4">
        <p className="text-[10px] font-bold text-discord-muted uppercase tracking-widest px-3 py-1.5">
          {title} — {list.length}
        </p>
        <div className="space-y-0.5">
          {list.map(u => <UserRow key={u.id} user={u} />)}
        </div>
      </div>
    )
  }

  return (
    <aside className="w-[200px] flex flex-col flex-shrink-0"
           style={{ background: '#0A0D1D', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="px-3 py-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <h3 className="text-[10px] font-bold text-discord-muted uppercase tracking-widest">Mitglieder</h3>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-1">
        <Section title="Online"   list={online} />
        <Section title="Abwesend" list={away} />
        <Section title="Offline"  list={offline} />
      </div>
    </aside>
  )
}
