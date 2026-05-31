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
      <Volume2 size={48} className="text-discord-muted mb-3" />
      <h2 className="text-2xl font-bold text-white mb-1">{channel.name}</h2>
      {channel.description && <p className="text-discord-muted text-sm mb-6">{channel.description}</p>}

      {/* Participants */}
      {participants.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-6 mb-8">
          {participants.map(u => (
            <div key={u.id} className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar user={u} size={64} showStatus={false} />
                <div className="absolute -bottom-1 -right-1 bg-discord-green rounded-full p-1">
                  <Volume2 size={10} className="text-white" />
                </div>
              </div>
              <span className="text-sm text-discord-text">{u.displayName}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-discord-muted text-sm mb-8">Niemand ist derzeit im Raum.</p>
      )}

      {/* Join / Leave controls */}
      <div className="flex items-center gap-3">
        {amIn ? (
          <>
            <button
              className="flex items-center gap-2 bg-discord-input hover:bg-discord-hover text-discord-text px-4 py-2 rounded-full text-sm transition-colors"
              onClick={() => setMuted(v => !v)}
            >
              {muted ? <MicOff size={16} className="text-discord-red" /> : <Mic size={16} />}
              {muted ? 'Stummgeschaltet' : 'Mikrofon an'}
            </button>
            <button
              className="flex items-center gap-2 bg-discord-red hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm transition-colors"
              onClick={() => leaveVoiceChannel(channel.id)}
            >
              <PhoneOff size={16} /> Verlassen
            </button>
          </>
        ) : (
          <button
            className="flex items-center gap-2 bg-discord-green hover:bg-green-600 text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-colors"
            onClick={() => joinVoiceChannel(channel.id)}
          >
            <Volume2 size={16} /> Beitreten
          </button>
        )}
      </div>
    </div>
  )
}
