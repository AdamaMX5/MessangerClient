import { useState } from 'react'
import { Video, PhoneOff, Mic, MicOff, VideoOff, Monitor } from 'lucide-react'
import type { Channel } from '../../types'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'

export default function VideoRoomView({ channel }: { channel: Channel }) {
  const { users, currentUser, joinVoiceChannel, leaveVoiceChannel } = useApp()
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)

  const participantIds = channel.voiceParticipantIds ?? []
  const participants = users.filter(u => participantIds.includes(u.id))
  const amIn = currentUser ? participantIds.includes(currentUser.id) : false

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 text-center">
      <Video size={48} className="text-discord-muted mb-3" />
      <h2 className="text-2xl font-bold text-white mb-1">{channel.name}</h2>
      {channel.description && <p className="text-discord-muted text-sm mb-6">{channel.description}</p>}

      {/* Video tiles */}
      {participants.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {participants.map(u => (
            <div key={u.id} className="relative w-40 h-28 bg-discord-channels rounded-xl overflow-hidden flex items-center justify-center border border-white/10">
              <Avatar user={u} size={48} showStatus={false} />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-xs text-white bg-black/50 px-1.5 py-0.5 rounded truncate">{u.displayName}</span>
                <Mic size={10} className="text-discord-green" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-discord-muted text-sm mb-8">Niemand ist derzeit im Videoraum.</p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {amIn ? (
          <>
            <button className="flex items-center gap-1.5 bg-discord-input hover:bg-discord-hover text-discord-text px-3 py-2 rounded-full text-sm transition-colors" onClick={() => setMuted(v => !v)}>
              {muted ? <MicOff size={15} className="text-discord-red" /> : <Mic size={15} />}
            </button>
            <button className="flex items-center gap-1.5 bg-discord-input hover:bg-discord-hover text-discord-text px-3 py-2 rounded-full text-sm transition-colors" onClick={() => setCamOff(v => !v)}>
              {camOff ? <VideoOff size={15} className="text-discord-red" /> : <Video size={15} />}
            </button>
            <button className="flex items-center gap-1.5 bg-discord-input hover:bg-discord-hover text-discord-text px-3 py-2 rounded-full text-sm transition-colors">
              <Monitor size={15} />
            </button>
            <button className="flex items-center gap-2 bg-discord-red hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm transition-colors" onClick={() => leaveVoiceChannel(channel.id)}>
              <PhoneOff size={15} /> Verlassen
            </button>
          </>
        ) : (
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-discord-channels hover:bg-discord-hover text-discord-text border border-white/10 px-5 py-2.5 rounded-full text-sm transition-colors" onClick={() => joinVoiceChannel(channel.id)}>
              <Mic size={16} /> Nur Audio
            </button>
            <button className="flex items-center gap-2 bg-discord-blurple hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold transition-colors" onClick={() => joinVoiceChannel(channel.id)}>
              <Video size={16} /> Mit Video beitreten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
