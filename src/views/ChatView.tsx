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
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
      <div className="w-20 h-20 bg-discord-blurple rounded-3xl flex items-center justify-center text-4xl font-black text-white mb-2">M</div>
      <h2 className="text-2xl font-bold text-white">Willkommen im MessengerClient</h2>
      <p className="text-discord-muted max-w-sm">Wähle links einen Channel oder eine Konversation, um zu starten.</p>
    </div>
  )
}

function MainContent() {
  const { activeChannelId, activeConversationId, activeSpaceId,
          getChannel, getConversation, currentUser, getUser,
          sendDM, sendChannelMessage } = useApp()

  // ─── DM conversation ──────────────────────────────────────────────────────
  if (!activeSpaceId && activeConversationId) {
    const conv = getConversation(activeConversationId)
    if (!conv || !currentUser) return <EmptyState />
    return (
      <>
        <ChatArea messages={conv.messages} currentUserId={currentUser.id} getUser={getUser} />
        <MessageInput
          placeholder="Nachricht schreiben…"
          onSend={body => sendDM(activeConversationId, body)}
        />
      </>
    )
  }

  // ─── Channel ──────────────────────────────────────────────────────────────
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
            onSend={body => sendChannelMessage(activeChannelId, body)}
          />
        </>
      )
    }
  }

  return <EmptyState />
}

export default function ChatView() {
  const { showUserList, activeSpaceId, activeConversationId, activeChannelId } = useApp()
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
