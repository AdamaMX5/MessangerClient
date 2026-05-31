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

  // For demo: first participant is speaker, rest are audience
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

  return (
    <div className="flex-1 flex flex-col overflow-y-auto px-8 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Presentation size={22} className="text-discord-blurple" />
        <h2 className="text-xl font-bold text-white">{channel.name}</h2>
        {channel.description && <span className="text-discord-muted text-sm">— {channel.description}</span>}
      </div>

      {/* Stage / Speakers */}
      <div className="bg-discord-channels rounded-xl p-6 mb-4 border border-white/5">
        <p className="text-xs font-semibold text-discord-muted uppercase mb-4 flex items-center gap-1">
          <Mic size={11} /> Bühne — Sprecher ({speakers.length})
        </p>
        {speakers.length > 0 ? (
          <div className="flex flex-wrap gap-6">
            {speakers.map(u => (
              <div key={u.id} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Avatar user={u} size={72} showStatus={false} />
                  <div className="absolute -bottom-1 -right-1 bg-discord-blurple rounded-full p-1.5">
                    <Mic size={10} className="text-white" />
                  </div>
                </div>
                <span className="text-sm text-discord-text">{u.displayName}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-discord-muted text-sm">Noch kein Sprecher auf der Bühne.</p>
        )}
      </div>

      {/* Audience */}
      <div className="bg-discord-channels rounded-xl p-4 mb-6 border border-white/5">
        <p className="text-xs font-semibold text-discord-muted uppercase mb-3 flex items-center gap-1">
          <Users size={11} /> Publikum ({audience.length})
        </p>
        {audience.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {audience.map(u => (
              <div key={u.id} className="flex items-center gap-2">
                <Avatar user={u} size={28} showStatus={false} />
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
          <button className="flex items-center gap-2 bg-discord-blurple hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors" onClick={() => join('speaker')}>
            <Mic size={16} /> Als Sprecher beitreten
          </button>
          <button className="flex items-center gap-2 bg-discord-channels hover:bg-discord-hover text-discord-text border border-white/10 px-5 py-2.5 rounded-full text-sm transition-colors" onClick={() => join('audience')}>
            <Users size={16} /> Als Zuschauer beitreten
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 justify-center">
          <span className="text-sm text-discord-muted">Du bist als {role === 'speaker' ? 'Sprecher' : 'Zuschauer'} dabei</span>
          <button className="flex items-center gap-2 bg-discord-red hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm transition-colors" onClick={leave}>
            <PhoneOff size={15} /> Verlassen
          </button>
        </div>
      )}
    </div>
  )
}
