import type { User } from '../../types'

const STATUS_COLORS: Record<string, string> = {
  online:  'bg-discord-green',
  away:    'bg-discord-yellow',
  dnd:     'bg-discord-red',
  offline: 'bg-discord-gray',
}

interface Props {
  user: User
  size?: number
  showStatus?: boolean
}

export default function Avatar({ user, size = 32, showStatus = true }: Props) {
  const initials = user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.displayName}
          className="rounded-full w-full h-full object-cover bg-discord-channels"
        />
      ) : (
        <div
          className="rounded-full w-full h-full flex items-center justify-center bg-discord-blurple text-white font-semibold"
          style={{ fontSize: size * 0.35 }}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-discord-channels ${STATUS_COLORS[user.status]}`}
          style={{ width: size * 0.32, height: size * 0.32 }}
        />
      )}
    </div>
  )
}
