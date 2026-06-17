import { useState } from 'react'
import { Presentation, Mic, Users, PhoneOff } from 'lucide-react'
import type { Channel } from '../../types'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'

export default function StageView({ channel }: { channel: Channel }) {
  const { users, currentUser, joinVoiceChannel, leaveVoiceChannel } = useApp()
  const [role, setRole] = useState<'none' | 'speaker' | 'audience'>('none')

  const participantIds = channel.voiceParticipantIds ?? []
  const allParticipants = users.filter(u => participantIds.includes(u.id))
  const speakers = allParticipants.slice(0, 1)
  const audience = allParticipants.slice(1)

  function join(r: 'speaker' | 'audience') {
    setRole(r)
    joinVoiceChannel(channel.id)
  }

  function leave() {
    setRole('none')
    leaveVoiceChannel(channel.id)
  }

  const cardStyle: React.CSSProperties = {
    background: '#0A0D1D',
    border: '1px solid rgba(255,255,255,0.05)',
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-8 py-8">
      <div className="flex items-center gap-2.5 mb-6">
        <Presentation size={20} className="text-discord-blurple flex-shrink-0" />
        <h2 className="font-display font-bold text-xl text-white">{channel.name}</h2>
        {channel.description && <span className="text-discord-muted text-sm">— {channel.description}</span>}
      </div>

      {/* Stage / Speakers */}
      <div className="rounded-xl p-5 mb-4" style={cardStyle}>
        <p className="text-[10px] font-bold text-discord-muted uppercase tracking-widest flex items-center gap-1.5 mb-4">
          <Mic size={10} className="text-discord-blurple" /> Bühne — Sprecher ({speakers.length})
        </p>
        {speakers.length > 0 ? (
          <div className="flex flex-wrap gap-6">
            {speakers.map(u => (
              <div key={u.id} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="rounded-full" style={{ padding: '2px', background: 'rgba(245,168,37,0.3)' }}>
                    <Avatar user={u} size={64} showStatus={false} />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 rounded-full p-1.5"
                       style={{ background: '#F5A825' }}>
                    <Mic size={9} style={{ color: '#05060E' }} />
                  </div>
                </div>
                <span className="text-sm text-discord-text font-medium">{u.displayName}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-discord-muted text-sm">Noch kein Sprecher auf der Bühne.</p>
        )}
      </div>

      {/* Audience */}
      <div className="rounded-xl p-4 mb-6" style={cardStyle}>
        <p className="text-[10px] font-bold text-discord-muted uppercase tracking-widest flex items-center gap-1.5 mb-3">
          <Users size={10} /> Publikum ({audience.length})
        </p>
        {audience.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {audience.map(u => (
              <div key={u.id} className="flex items-center gap-2">
                <Avatar user={u} size={26} showStatus={false} />
                <span className="text-xs text-discord-muted">{u.displayName}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-discord-muted text-sm">Noch kein Publikum.</p>
        )}
      </div>

      {/* Join controls */}
      {role === 'none' ? (
        <div className="flex gap-3 justify-center">
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-150 hover:brightness-110"
            style={{ background: '#F5A825', color: '#05060E' }}
            onClick={() => join('speaker')}
          >
            <Mic size={15} /> Als Sprecher beitreten
          </button>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 hover:brightness-110"
            style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.1)', color: '#D4D8EE' }}
            onClick={() => join('audience')}
          >
            <Users size={15} /> Als Zuschauer beitreten
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 justify-center">
          <span className="text-sm text-discord-muted">
            Du bist als {role === 'speaker' ? 'Sprecher' : 'Zuschauer'} dabei
          </span>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 hover:brightness-110"
            style={{ background: '#F07070', color: '#fff' }}
            onClick={leave}
          >
            <PhoneOff size={14} /> Verlassen
          </button>
        </div>
      )}
    </div>
  )
}
