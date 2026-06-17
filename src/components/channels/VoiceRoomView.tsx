import { useState } from 'react'
import { Volume2, PhoneOff, Mic, MicOff } from 'lucide-react'
import type { Channel } from '../../types'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'

export default function VoiceRoomView({ channel }: { channel: Channel }) {
  const { users, currentUser, joinVoiceChannel, leaveVoiceChannel } = useApp()
  const [muted, setMuted] = useState(false)

  const participantIds = channel.voiceParticipantIds ?? []
  const participants = users.filter(u => participantIds.includes(u.id))
  const amIn = currentUser ? participantIds.includes(currentUser.id) : false

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 text-center">
      {/* Icon + title */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
             style={{ background: 'rgba(52,212,155,0.1)', border: '1px solid rgba(52,212,155,0.2)' }}>
          <Volume2 size={28} className="text-discord-green" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl text-white">{channel.name}</h2>
          {channel.description && <p className="text-discord-muted text-sm mt-1">{channel.description}</p>}
        </div>
      </div>

      {/* Participants */}
      {participants.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {participants.map(u => (
            <div key={u.id} className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="rounded-full" style={{ padding: '2px', background: 'rgba(52,212,155,0.3)' }}>
                  <Avatar user={u} size={56} showStatus={false} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 rounded-full p-1"
                     style={{ background: '#34D49B' }}>
                  <Volume2 size={9} style={{ color: '#05060E' }} />
                </div>
              </div>
              <span className="text-xs text-discord-text font-medium">{u.displayName}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-discord-muted text-sm mb-8">Niemand ist derzeit im Raum.</p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {amIn ? (
          <>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-150"
              style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.08)', color: '#D4D8EE' }}
              onClick={() => setMuted(v => !v)}
            >
              {muted ? <MicOff size={15} className="text-discord-red" /> : <Mic size={15} />}
              {muted ? 'Stummgeschaltet' : 'Mikrofon an'}
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 hover:brightness-110"
              style={{ background: '#F07070', color: '#fff' }}
              onClick={() => leaveVoiceChannel(channel.id)}
            >
              <PhoneOff size={15} /> Verlassen
            </button>
          </>
        ) : (
          <button
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-150 hover:brightness-110"
            style={{ background: '#34D49B', color: '#05060E' }}
            onClick={() => joinVoiceChannel(channel.id)}
          >
            <Volume2 size={16} /> Beitreten
          </button>
        )}
      </div>
    </div>
  )
}
