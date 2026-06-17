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

  const ctrlBtn = 'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150'
  const ctrlSecondary = { background: '#111528', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 text-center">
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
             style={{ background: 'rgba(245,168,37,0.1)', border: '1px solid rgba(245,168,37,0.2)' }}>
          <Video size={28} className="text-discord-blurple" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl text-white">{channel.name}</h2>
          {channel.description && <p className="text-discord-muted text-sm mt-1">{channel.description}</p>}
        </div>
      </div>

      {/* Video tiles */}
      {participants.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {participants.map(u => (
            <div
              key={u.id}
              className="relative w-44 h-32 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ background: '#0A0D1D', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Avatar user={u} size={48} showStatus={false} />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <span className="text-[10px] text-white font-medium px-1.5 py-0.5 rounded truncate"
                      style={{ background: 'rgba(0,0,0,0.6)' }}>
                  {u.displayName}
                </span>
                <Mic size={9} className="text-discord-green" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-discord-muted text-sm mb-8">Niemand ist derzeit im Videoraum.</p>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {amIn ? (
          <>
            <button className={ctrlBtn} style={ctrlSecondary} onClick={() => setMuted(v => !v)} title={muted ? 'Stummschaltung aufheben' : 'Stummschalten'}>
              {muted ? <MicOff size={16} className="text-discord-red" /> : <Mic size={16} className="text-discord-text" />}
            </button>
            <button className={ctrlBtn} style={ctrlSecondary} onClick={() => setCamOff(v => !v)} title={camOff ? 'Kamera einschalten' : 'Kamera ausschalten'}>
              {camOff ? <VideoOff size={16} className="text-discord-red" /> : <Video size={16} className="text-discord-text" />}
            </button>
            <button className={ctrlBtn} style={ctrlSecondary} title="Bildschirm teilen">
              <Monitor size={16} className="text-discord-text" />
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 hover:brightness-110 ml-1"
              style={{ background: '#F07070', color: '#fff' }}
              onClick={() => leaveVoiceChannel(channel.id)}
            >
              <PhoneOff size={14} /> Verlassen
            </button>
          </>
        ) : (
          <div className="flex gap-3">
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 hover:brightness-110"
              style={{ background: '#111528', border: '1px solid rgba(255,255,255,0.1)', color: '#D4D8EE' }}
              onClick={() => joinVoiceChannel(channel.id)}
            >
              <Mic size={15} /> Nur Audio
            </button>
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-150 hover:brightness-110"
              style={{ background: '#F5A825', color: '#05060E' }}
              onClick={() => joinVoiceChannel(channel.id)}
            >
              <Video size={15} /> Mit Video beitreten
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
