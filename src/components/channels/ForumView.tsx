import { useState } from 'react'
import { BookOpen, ChevronLeft, Pin, Tag, MessageSquare } from 'lucide-react'
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
      className="rounded-xl p-4 border cursor-pointer transition-all duration-150 hover:border-discord-blurple/25 hover:bg-discord-hover"
      style={{ background: '#0A0D1D', border: '1px solid rgba(255,255,255,0.05)' }}
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        {author && <Avatar user={author} size={34} showStatus={false} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {post.pinned && <Pin size={12} className="text-discord-yellow flex-shrink-0" />}
            <h3 className="text-white font-semibold text-sm truncate">{post.title}</h3>
          </div>
          <p className="text-discord-muted text-xs mb-2.5 line-clamp-2 leading-relaxed">{post.body}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {post.tags?.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[10px] bg-discord-blurple/15 text-discord-blurple px-2 py-0.5 rounded-full font-semibold">
                <Tag size={9} /> {tag}
              </span>
            ))}
            <span className="text-xs text-discord-muted ml-auto flex items-center gap-1">
              <MessageSquare size={10} /> {post.replies.length}
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
        <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            className="flex items-center gap-1.5 text-sm text-discord-muted hover:text-discord-text transition-colors"
            onClick={() => setOpenPost(null)}
          >
            <ChevronLeft size={14} /> Zurück
          </button>
          <div className="w-px h-4 bg-discord-muted/30" />
          <span className="text-white font-semibold text-sm truncate">{openPost.title}</span>
        </div>
        {currentUser && (
          <>
            <ChatArea messages={allMessages} currentUserId={currentUser.id} getUser={getUser} />
            <MessageInput placeholder="Antwort schreiben…" onSend={body => sendChannelMessage(channel.id, body)} />
          </>
        )}
      </div>
    )
  }

  // posts === undefined → still lazy-loading from the ObjectService;
  // posts === [] → loaded, genuinely empty.
  const isLoading = channel.posts === undefined
  const pinned  = channel.posts?.filter(p => p.pinned) ?? []
  const regular = channel.posts?.filter(p => !p.pinned) ?? []

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
      <div className="flex items-center gap-2.5 mb-5">
        <BookOpen size={19} className="text-discord-blurple flex-shrink-0" />
        <h2 className="font-display font-bold text-xl text-white">{channel.name}</h2>
        <span className="text-discord-muted text-sm ml-1">{channel.posts?.length ?? 0} Beiträge</span>
      </div>

      {pinned.length > 0 && (
        <>
          <p className="text-[10px] font-bold text-discord-muted uppercase tracking-widest flex items-center gap-1.5">
            <Pin size={10} /> Angepinnt
          </p>
          {pinned.map(post => <PostCard key={post.id} post={post} onOpen={() => setOpenPost(post)} />)}
          <div className="h-px my-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </>
      )}

      {regular.map(post => <PostCard key={post.id} post={post} onOpen={() => setOpenPost(post)} />)}

      {isLoading && (
        <p className="text-discord-muted text-sm">Beiträge werden geladen…</p>
      )}
      {!isLoading && !channel.posts?.length && (
        <p className="text-discord-muted text-sm">Noch keine Beiträge. Erstelle den ersten!</p>
      )}
    </div>
  )
}
