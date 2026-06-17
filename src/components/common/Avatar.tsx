import type { User } from '../../types'

const STATUS_COLORS: Record<string, string> = {
  online:  '#34D49B',
  away:    '#F5C842',
  dnd:     '#F07070',
  offline: '#3E4A65',
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
          className="rounded-full w-full h-full object-cover"
          style={{ background: '#0A0D1D' }}
        />
      ) : (
        <div
          className="rounded-full w-full h-full flex items-center justify-center font-bold"
          style={{
            background: '#F5A825',
            color: '#05060E',
            fontSize: size * 0.36,
          }}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span
          className="absolute bottom-0 right-0 rounded-full"
          style={{
            width: size * 0.33,
            height: size * 0.33,
            background: STATUS_COLORS[user.status] ?? '#3E4A65',
            border: `${Math.max(1.5, size * 0.06)}px solid #0A0D1D`,
          }}
        />
      )}
    </div>
  )
}
