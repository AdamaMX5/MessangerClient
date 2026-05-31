import type { UserStatus } from '../../types'

const LABELS: Record<UserStatus, string> = {
  online:  'Online',
  away:    'Abwesend',
  dnd:     'Nicht stören',
  offline: 'Offline',
}

const COLORS: Record<UserStatus, string> = {
  online:  'text-discord-green',
  away:    'text-discord-yellow',
  dnd:     'text-discord-red',
  offline: 'text-discord-gray',
}

export default function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span className={`text-xs font-medium ${COLORS[status]}`}>
      {LABELS[status]}
    </span>
  )
}
