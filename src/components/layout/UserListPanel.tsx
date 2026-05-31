import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'
import type { User } from '../../types'

function UserRow({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-discord-hover cursor-pointer group">
      <Avatar user={user} size={32} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-discord-text truncate group-hover:text-white">{user.displayName}</p>
        <p className="text-xs text-discord-muted truncate">
          {user.roles.includes('customer') ? 'Kunde' : user.roles.includes('admin') ? 'Admin' : 'Mitarbeiter'}
        </p>
      </div>
    </div>
  )
}

export default function UserListPanel() {
  const { users, spaces, conversations, activeSpaceId, activeConversationId, activeChannelId, getChannel, getConversation, currentUser } = useApp()

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
      <div className="mb-3">
        <p className="text-xs font-semibold text-discord-muted uppercase px-3 py-1">{title} — {list.length}</p>
        {list.map(u => <UserRow key={u.id} user={u} />)}
      </div>
    )
  }

  return (
    <aside className="w-[200px] bg-discord-channels flex flex-col flex-shrink-0 border-l border-black/20">
      <div className="px-3 py-3 border-b border-black/20">
        <h3 className="text-xs font-semibold text-discord-muted uppercase">Mitglieder</h3>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-1">
        <Section title="Online" list={online} />
        <Section title="Abwesend" list={away} />
        <Section title="Offline" list={offline} />
      </div>
    </aside>
  )
}
