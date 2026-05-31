import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronRight, Pin, Tag, MessageSquare } from 'lucide-react'
import type { Channel, ForumPost } from '../../types'
import { useApp } from '../../store/AppContext'
import Avatar from '../common/Avatar'
import ChatArea from '../chat/ChatArea'
import MessageInput from '../chat/MessageInput'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function PostCard({ post, onOpen }: { post: ForumPost; onOpen: () => void }) {
  const { getUser } = useApp()
  const author = getUser(post.authorId)

  return (
    <div
      className="bg-discord-channels rounded-lg p-4 border border-white/5 hover:border-discord-blurple/30 cursor-pointer transition-colors"
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        {author && <Avatar user={author} size={36} showStatus={false} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.pinned && <Pin size={13} className="text-discord-yellow flex-shrink-0" />}
            <h3 className="text-white font-semibold text-sm truncate">{post.title}</h3>
          </div>
          <p className="text-discord-muted text-xs mb-2 line-clamp-2">{post.body}</p>
          <div className="flex items-center gap-3">
            {post.tags?.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-xs bg-discord-blurple/20 text-discord-blurple px-2 py-0.5 rounded-full">
                <Tag size={10} /> {tag}
              </span>
            ))}
            <span className="text-xs text-discord-muted ml-auto flex items-center gap-1">
              <MessageSquare size={11} /> {post.replies.length} Antworten
            </span>
            <span className="text-xs text-discord-muted">{formatDate(post.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ForumView({ channel }: { channel: Channel }) {
  const { getUser, currentUser, sendChannelMessage } = useApp()
  const [openPost, setOpenPost] = useState<ForumPost | null>(null)

  if (openPost) {
    const allMessages = [
      { id: openPost.id + '-body', senderId: openPost.authorId, channelId: channel.id, body: openPost.body, createdAt: openPost.createdAt, readAt: null },
      ...openPost.replies,
    ]
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="px-6 py-3 border-b border-black/20 flex items-center gap-2">
          <button className="text-discord-muted hover:text-discord-text flex items-center gap-1 text-sm" onClick={() => setOpenPost(null)}>
            <ChevronRight size={14} className="rotate-180" /> Zurück zum Forum
          </button>
          <span className="text-discord-muted">·</span>
          <span className="text-white font-semibold text-sm truncate">{openPost.title}</span>
        </div>
        {currentUser && (
          <>
            <ChatArea messages={allMessages} currentUserId={currentUser.id} getUser={getUser} />
            <MessageInput
              placeholder="Antwort schreiben…"
              onSend={body => sendChannelMessage(channel.id, body)}
            />
          </>
        )}
      </div>
    )
  }

  const pinned = channel.posts?.filter(p => p.pinned) ?? []
  const regular = channel.posts?.filter(p => !p.pinned) ?? []

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={20} className="text-discord-blurple" />
        <h2 className="text-xl font-bold text-white">{channel.name}</h2>
        <span className="text-discord-muted text-sm ml-2">{channel.posts?.length ?? 0} Beiträge</span>
      </div>

      {pinned.length > 0 && (
        <>
          <p className="text-xs font-semibold text-discord-muted uppercase flex items-center gap-1"><Pin size={11} /> Angepinnt</p>
          {pinned.map(post => <PostCard key={post.id} post={post} onOpen={() => setOpenPost(post)} />)}
          <div className="h-px bg-white/10 my-2" />
        </>
      )}

      {regular.map(post => <PostCard key={post.id} post={post} onOpen={() => setOpenPost(post)} />)}

      {!channel.posts?.length && (
        <p className="text-discord-muted text-sm">Noch keine Beiträge. Erstelle den ersten!</p>
      )}
    </div>
  )
}
