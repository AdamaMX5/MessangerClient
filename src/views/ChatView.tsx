import { useApp } from '../store/AppContext'
import AppSidebar from '../components/layout/AppSidebar'
import ChannelSidebar from '../components/layout/ChannelSidebar'
import TopBar from '../components/layout/TopBar'
import UserListPanel from '../components/layout/UserListPanel'
import ChatArea from '../components/chat/ChatArea'
import MessageInput from '../components/chat/MessageInput'
import AnnouncementView from '../components/channels/AnnouncementView'
import ForumView from '../components/channels/ForumView'
import FaqView from '../components/channels/FaqView'
import OnBoardingView from '../components/channels/OnBoardingView'
import VoiceRoomView from '../components/channels/VoiceRoomView'
import VideoRoomView from '../components/channels/VideoRoomView'
import StageView from '../components/channels/StageView'

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-4">
      {/* Decorative rings */}
      <div className="relative flex items-center justify-center mb-2">
        <div className="absolute w-32 h-32 rounded-full" style={{ border: '1px solid rgba(245,168,37,0.12)' }} />
        <div className="absolute w-48 h-48 rounded-full" style={{ border: '1px solid rgba(245,168,37,0.06)' }} />
        <div className="absolute w-64 h-64 rounded-full" style={{ border: '1px solid rgba(245,168,37,0.03)' }} />
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
             style={{ background: '#F5A825', boxShadow: '0 0 30px 6px rgba(245,168,37,0.2)' }}>
          <span className="font-display font-black text-3xl" style={{ color: '#05060E' }}>M</span>
        </div>
      </div>

      <div>
        <h2 className="font-display text-2xl font-bold text-white mb-2">MessengerClient</h2>
        <p className="text-discord-muted text-sm max-w-xs leading-relaxed">
          Wähle links einen Channel oder eine Konversation, um zu starten.
        </p>
      </div>
    </div>
  )
}

function MainContent() {
  const { activeChannelId, activeConversationId, activeSpaceId,
          getChannel, getConversation, currentUser, getUser,
          sendDM, sendChannelMessage, e2eUnlocked, channelE2EReady } = useApp()

  if (!activeSpaceId && activeConversationId) {
    const conv = getConversation(activeConversationId)
    if (!conv || !currentUser) return <EmptyState />
    return (
      <>
        {conv.isLoading
          ? <div className="flex-1 flex items-center justify-center text-discord-muted text-sm">Lädt Nachrichten…</div>
          : <ChatArea messages={conv.messages} currentUserId={currentUser.id} getUser={getUser} />}
        <MessageInput
          placeholder="Nachricht schreiben…"
          warning={!conv.isGroup && !e2eUnlocked
            ? 'E2E-Sitzung gesperrt – Nachrichten werden unverschlüsselt gesendet.'
            : undefined}
          onSend={body => { void sendDM(activeConversationId, body) }}
        />
      </>
    )
  }

  if (activeChannelId) {
    const ch = getChannel(activeChannelId)
    if (!ch || !currentUser) return <EmptyState />

    switch (ch.type) {
      case 'announcement': return <AnnouncementView channel={ch} />
      case 'forum':        return <ForumView channel={ch} />
      case 'faq':          return <FaqView channel={ch} />
      case 'onboarding':   return <OnBoardingView channel={ch} />
      case 'voice':        return <VoiceRoomView channel={ch} />
      case 'video':        return <VideoRoomView channel={ch} />
      case 'stage':        return <StageView channel={ch} />
      default:             return (
        <>
          <ChatArea messages={ch.messages} currentUserId={currentUser.id} getUser={getUser} />
          <MessageInput
            placeholder={`Nachricht an #${ch.name}`}
            warning={ch.isEncrypted && !channelE2EReady(ch.id)
              ? 'Kein Channel-Schlüssel geladen – Nachrichten werden unverschlüsselt gesendet.'
              : undefined}
            onSend={body => { void sendChannelMessage(activeChannelId, body) }}
          />
        </>
      )
    }
  }

  return <EmptyState />
}

export default function ChatView() {
  const { showUserList, activeConversationId, activeChannelId } = useApp()
  const hasActive = !!(activeConversationId || activeChannelId)

  return (
    <div className="flex h-screen overflow-hidden bg-discord-chat text-discord-text">
      <AppSidebar />
      <ChannelSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1 overflow-hidden bg-discord-chat">
            <MainContent />
          </div>
          {showUserList && hasActive && <UserListPanel />}
        </div>
      </div>
    </div>
  )
}
