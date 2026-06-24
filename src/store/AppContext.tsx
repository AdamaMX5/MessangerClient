import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { User, UserRole, UserStatus, Space, Conversation, Channel, Message } from '../types'
import { MOCK_USERS } from '../data/mockData'
import { authService } from '../services/authService'
import { profileService, type MessangerProfile } from '../services/profileService'
import { messageService } from '../services/messageService'
import { objectService } from '../services/objectService'
import { clearAccessToken } from '../services/tokenStore'
import { e2eService } from '../services/e2eService'
import {
  encryptDmBody, decryptDmBody, encryptChannelBody, decryptChannelBody,
} from '../services/crypto/messageCrypto'
import { buildMessage, deriveConversations, toUiMessage, upsertConversationMessage } from './dmHelpers'
import { scanMemberships, sameMembership } from './membershipHelpers'
import {
  groupChannels, toSpace, toForumPost,
  type SpaceData, type ChannelData, type ForumPostData,
} from './spacesHelpers'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000
const CONVERSATION_LIST_POLL_MS = 15 * 1000
const ACTIVE_CONVERSATION_POLL_MS = 10 * 1000
const ACTIVE_CHANNEL_POLL_MS = 10 * 1000

// Channel types whose content is a text-message feed backed by the MessageService.
const MESSAGE_CHANNEL_TYPES = new Set(['text', 'announcement'])

// Apply a transform to one channel's message list anywhere in the spaces tree,
// returning a new spaces array (pure — safe to use inside a setSpaces updater).
function mapChannelMessages(
  spaces: Space[],
  channelId: string,
  fn: (msgs: Message[]) => Message[],
): Space[] {
  return spaces.map(space => ({
    ...space,
    categories: space.categories.map(cat => ({
      ...cat,
      channels: cat.channels.map(ch =>
        ch.id === channelId ? { ...ch, messages: fn(ch.messages) } : ch),
    })),
  }))
}

interface JwtPayload {
  sub?: string
  email?: string
  roles?: string[]
}

// Decode a JWT payload for UI purposes only — this is NOT a security check,
// the server remains the source of truth for authorization.
function decodeJwtPayload(token: string): JwtPayload {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return {}
  }
}

// Merge JWT identity with freshly fetched profile data into the UI User shape.
// The JWT identity (id/email/roles) is passed in so this can be reused both on
// login (decode token) and on a later profile refresh (keep prior identity).
async function buildUserFromProfiles(jwt: JwtPayload): Promise<User> {
  const [global, vo] = await Promise.all([
    profileService.myGlobalProfile().catch(() => null),
    profileService.myVirtualOfficeProfile().catch(() => null),
  ])
  return {
    id: jwt.sub ?? '',
    email: jwt.email ?? global?.email ?? '',
    // AuthService issues roles in upper case (e.g. "ADMIN"); the UI's UserRole
    // type and all role gating use lower case. Normalize here so every consumer
    // (space/channel creation, user list labels) compares consistently.
    roles: (jwt.roles ?? []).map(r => r.toLowerCase()) as UserRole[],
    displayName: global?.displayName ?? jwt.email ?? '',
    avatarUrl: global?.avatar || undefined,
    status: (vo?.status as UserStatus) ?? 'online',
  }
}

function buildCurrentUser(token: string): Promise<User> {
  return buildUserFromProfiles(decodeJwtPayload(token))
}

interface AppContextType {
  // Auth
  currentUser: User | null
  isAuthLoading: boolean
  checkEmail: (email: string) => Promise<'login' | 'register'>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, repassword: string) => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>

  // Data
  users: User[]
  spaces: Space[]
  conversations: Conversation[]
  // Cached space/channel memberships, reconciled in the background after login.
  messangerProfile: MessangerProfile | null
  // True while the personal E2E key is unlocked this session (#12). When false,
  // encrypted channels fall back to plaintext — the UI warns about it.
  e2eUnlocked: boolean
  // Whether an encrypted channel has a usable group key loaded this session.
  // False → messages would be sent as plaintext; the UI shows the warning state.
  channelE2EReady: (channelId: string) => boolean
  reloadSpaces: () => Promise<void>

  // Navigation
  activeSpaceId: string | null
  activeChannelId: string | null
  activeConversationId: string | null
  setActiveSpace: (id: string | null) => void
  setActiveChannel: (id: string) => void
  setActiveConversation: (id: string) => void

  // UI
  showUserList: boolean
  toggleUserList: () => void

  // Actions
  sendDM: (conversationId: string, body: string) => Promise<void>
  sendChannelMessage: (channelId: string, body: string) => Promise<void>
  joinVoiceChannel: (channelId: string) => void
  leaveVoiceChannel: (channelId: string) => void

  // Helpers
  getUser: (id: string) => User | undefined
  getChannel: (id: string) => Channel | undefined
  getConversation: (id: string) => Conversation | undefined
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [users] = useState<User[]>(MOCK_USERS)
  const [spaces, setSpaces] = useState<Space[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messangerProfile, setMessangerProfile] = useState<MessangerProfile | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  // Whether the personal E2E key is unlocked this session. False after a silent
  // refresh restore (no password) — surfaces the plaintext-downgrade risk in the
  // UI rather than failing silently (#12).
  const [e2eUnlocked, setE2eUnlocked] = useState(false)
  // Channel ids for which a usable group key is loaded this session. Drives the
  // channel encryption indicator precisely: an encrypted channel without a key
  // (even with the session unlocked) still sends plaintext, so it must NOT show
  // as secure (#12).
  const [e2eReadyChannels, setE2eReadyChannels] = useState<Set<string>>(new Set())

  // Mirror currentUser into a ref so callbacks can read the latest identity
  // without taking it as a dependency (avoids recreating stable callbacks).
  const currentUserRef = useRef<User | null>(null)
  currentUserRef.current = currentUser

  // Mirror spaces into a ref so the channel-message loader can look up a
  // channel's type without taking `spaces` as an effect dependency (which would
  // re-trigger the load on every message update and loop).
  const spacesRef = useRef<Space[]>([])
  spacesRef.current = spaces

  // Cache of resolved DM-partner profiles (userId → display data), so the
  // sidebar can show names/avatars for users outside the static demo list.
  const partnerProfiles = useRef(new Map<string, { name: string; avatarUrl?: string }>())

  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showUserList, setShowUserList] = useState(true)

  // Set during logout so a refresh that resolves mid-logout cannot resurrect
  // the access token after we have cleared it.
  const loggingOutRef = useRef(false)

  const checkEmail = useCallback((email: string): Promise<'login' | 'register'> => {
    return authService.checkEmail(email)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    const session = await authService.login(email, password)
    const user = await buildCurrentUser(session.access_token)
    setCurrentUser(user)
    // Unlock (or first-time provision) the personal E2E keypair from the
    // password-encrypted backup. Never throws; leaves E2E disabled on failure.
    setE2eUnlocked(await e2eService.unlock(user.id, password))
  }, [])

  const register = useCallback(async (email: string, password: string, repassword: string): Promise<void> => {
    const session = await authService.registerComplete(email, password, repassword)
    const user = await buildCurrentUser(session.access_token)
    setCurrentUser(user)
    setE2eUnlocked(await e2eService.unlock(user.id, password))
  }, [])

  // Reload the current user's profile (e.g. after editing it) while preserving
  // the JWT-derived identity (id/email/roles), which profile data never owns.
  const refreshProfile = useCallback(async (): Promise<void> => {
    const prev = currentUserRef.current
    if (!prev) return
    const updated = await buildUserFromProfiles({ sub: prev.id, email: prev.email, roles: prev.roles })
    setCurrentUser(cur => (cur ? updated : cur))
  }, [])

  const logout = useCallback(async () => {
    // Flag first so any refresh resolving during the await cannot write back a token.
    loggingOutRef.current = true
    setCurrentUser(null)
    setActiveSpaceId(null)
    setActiveChannelId(null)
    setActiveConversationId(null)
    try {
      await authService.logout()
    } catch {
      // best effort; clear local token regardless
    } finally {
      clearAccessToken()
      // Wipe all in-memory key material so no secret outlives the session.
      e2eService.lock()
      setE2eUnlocked(false)
      setE2eReadyChannels(new Set())
      loggingOutRef.current = false
    }
  }, [])

  // Resolve display data (name/avatar) for any partner ids we have not cached
  // yet, then stamp it onto the matching conversations. One profile fetch per
  // unknown user; failures fall back to whatever the UI already shows.
  const enrichPartners = useCallback(async (partnerIds: string[]) => {
    const unknown = partnerIds.filter(id => !partnerProfiles.current.has(id))
    await Promise.all(unknown.map(async id => {
      try {
        const p = await profileService.globalProfile(id)
        partnerProfiles.current.set(id, { name: p.displayName, avatarUrl: p.avatar || undefined })
      } catch {
        partnerProfiles.current.set(id, { name: id })
      }
    }))
    setConversations(prev => prev.map(c => {
      const partner = partnerProfiles.current.get(c.id)
      return partner ? { ...c, partnerName: partner.name, partnerAvatarUrl: partner.avatarUrl } : c
    }))
  }, [])

  // Rebuild the conversation list from inbox + sent, preserving the locally
  // loaded full message history of the currently active conversation.
  const refreshConversationList = useCallback(async (userId: string, activeId: string | null) => {
    const [inbox, sent] = await Promise.all([
      messageService.getInbox(),
      messageService.getSent(),
    ])
    // Decrypt the preview message of each conversation for display; plaintext
    // and unopenable bodies are handled gracefully inside decryptDmBody.
    const derived = deriveConversations(inbox, sent, userId)
      .map(c => ({ ...c, messages: c.messages.map(m => {
        const d = decryptDmBody(m.body)
        return { ...m, encrypted: d.encrypted, body: d.text }
      }) }))
    setConversations(prev => derived.map(d => {
      const existing = prev.find(c => c.id === d.id)
      const partner = partnerProfiles.current.get(d.id)
      const keepHistory = existing && d.id === activeId && existing.messages.length > 1
      return {
        ...d,
        messages: keepHistory ? existing.messages : d.messages,
        unreadCount: d.id === activeId ? 0 : d.unreadCount,
        partnerName: partner?.name,
        partnerAvatarUrl: partner?.avatarUrl,
      }
    }))
    void enrichPartners(derived.map(d => d.id))
  }, [enrichPartners])

  // Load all spaces, then each space's channels, grouping them client-side into
  // categories so the Space shape the UI consumes stays identical to before.
  const loadSpaces = useCallback(async () => {
    const spaceObjs = await objectService.list<SpaceData>('spaces', { limit: 100 })
    const assembled = await Promise.all(spaceObjs.map(async s => {
      const channels = await objectService.list<ChannelData>('channels', {
        ref: { spaceId: s.id }, limit: 200,
      })
      return toSpace(s, groupChannels(channels))
    }))
    setSpaces(assembled)
  }, [])

  // (Re)load spaces on login; clear them on logout. Empty list is a valid state
  // (fresh ObjectService instance) — never seed mock data into the real service.
  useEffect(() => {
    if (!currentUser) { setSpaces([]); return }
    loadSpaces().catch(() => setSpaces([]))
  }, [currentUser, loadSpaces])

  // Load the cached MessangerProfil on login, then reconcile it against the
  // ObjectService in the background. The whole flow runs off the render path, so
  // the UI is usable immediately from the cache (non-blocking); the sequential
  // scan (one request at a time) and any profile write happen afterwards.
  useEffect(() => {
    if (!currentUser) { setMessangerProfile(null); return }
    const userId = currentUser.id
    let cancelled = false

    void (async () => {
      // 1. Fast start: show whatever the profile cache already knows.
      const cached = await profileService.myMessangerProfile().catch(() => null)
      if (cancelled) return
      if (cached) setMessangerProfile(cached)

      // 2. Reconcile: sequential sweep of all spaces/channels for real memberships.
      const fresh = await scanMemberships(userId).catch(() => null)
      if (cancelled || !fresh) return
      setMessangerProfile(fresh)

      // 3. Persist only when memberships actually changed since the cache.
      if (cancelled) return
      if (!cached || !sameMembership(cached, fresh)) {
        await profileService.updateMessangerProfile(fresh).catch(() => { /* best effort; retried next login */ })
      }
    })()

    return () => { cancelled = true }
  }, [currentUser])

  // Initial load + periodic refresh of the conversation list while logged in.
  useEffect(() => {
    if (!currentUser) {
      setConversations([])
      partnerProfiles.current.clear()
      return
    }
    const userId = currentUser.id
    void refreshConversationList(userId, activeConversationId)
    const id = setInterval(() => {
      void refreshConversationList(userId, activeConversationId)
    }, CONVERSATION_LIST_POLL_MS)
    return () => clearInterval(id)
    // activeConversationId intentionally excluded: list polling should not
    // restart on every conversation switch; the active id is read via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, refreshConversationList])

  // Load + poll the full history of the active conversation.
  useEffect(() => {
    if (!currentUser || !activeConversationId) return
    const partnerId = activeConversationId
    let cancelled = false

    const load = async () => {
      try {
        const msgs = await messageService.getConversation(partnerId)
        if (cancelled) return
        const uiMsgs = msgs.map(m => {
          const ui = toUiMessage(m, partnerId)
          const d = decryptDmBody(ui.body)
          return { ...ui, encrypted: d.encrypted, body: d.text }
        })
        setConversations(prev => prev.map(c =>
          c.id === partnerId ? { ...c, messages: uiMsgs, isLoading: false } : c
        ))
      } catch {
        if (!cancelled) {
          setConversations(prev => prev.map(c =>
            c.id === partnerId ? { ...c, isLoading: false } : c
          ))
        }
      }
    }

    setConversations(prev => prev.map(c =>
      c.id === partnerId ? { ...c, isLoading: c.messages.length <= 1 } : c
    ))
    void load()
    const id = setInterval(() => void load(), ACTIVE_CONVERSATION_POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [currentUser, activeConversationId])

  // Silent session restore on mount: if a refresh cookie exists, this succeeds
  // and rebuilds currentUser; otherwise it fails quietly and the LoginPage shows.
  useEffect(() => {
    let cancelled = false
    authService.refresh()
      .then(async token => {
        if (cancelled || loggingOutRef.current) return
        setCurrentUser(await buildCurrentUser(token))
      })
      .catch(() => { /* no valid session — stay logged out */ })
      .finally(() => { if (!cancelled) setIsAuthLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Keep the access token fresh while logged in.
  useEffect(() => {
    if (!currentUser) return
    const id = setInterval(() => {
      if (loggingOutRef.current) return
      authService.refresh().catch(() => { /* refresh failed; next interval retries */ })
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [currentUser])

  // Apply a patch to a single channel anywhere in the spaces tree.
  const updateChannel = useCallback((channelId: string, patch: Partial<Channel>) => {
    setSpaces(prev => prev.map(space => ({
      ...space,
      categories: space.categories.map(cat => ({
        ...cat,
        channels: cat.channels.map(ch =>
          ch.id === channelId ? { ...ch, ...patch } : ch
        ),
      })),
    })))
  }, [])

  // Lazy-load forum posts the first time a forum channel is opened.
  useEffect(() => {
    if (!activeChannelId) return
    const channel = spaces
      .flatMap(s => s.categories).flatMap(c => c.channels)
      .find(ch => ch.id === activeChannelId)
    if (!channel || channel.type !== 'forum' || channel.posts) return

    let cancelled = false
    objectService.list<ForumPostData>('forum-posts', { ref: { channelId: activeChannelId }, limit: 200 })
      .then(objs => { if (!cancelled) updateChannel(activeChannelId, { posts: objs.map(toForumPost) }) })
      .catch(() => { if (!cancelled) updateChannel(activeChannelId, { posts: [] }) })
    return () => { cancelled = true }
  }, [activeChannelId, spaces, updateChannel])

  // Load + poll the active channel's message feed from the MessageService.
  // Channel type is read from a ref (not `spaces`) so the effect does not
  // restart on every message update. Only feed-style channels (text/announcement)
  // have messages; other types render their own non-message views.
  useEffect(() => {
    if (!currentUser || !activeChannelId) return
    const channel = spacesRef.current
      .flatMap(s => s.categories).flatMap(c => c.channels)
      .find(ch => ch.id === activeChannelId)
    if (!channel || !MESSAGE_CHANNEL_TYPES.has(channel.type)) return

    const channelId = activeChannelId
    const userId = currentUser.id
    let cancelled = false
    const load = async () => {
      try {
        const msgs = await messageService.getChannelMessages(channelId)
        if (cancelled) return
        updateChannel(channelId, { messages: msgs.map(m => {
          const ui = toUiMessage(m, channelId)
          const d = decryptChannelBody(channelId, ui.body)
          return { ...ui, encrypted: d.encrypted, body: d.text }
        }) })
      } catch {
        // Not a member (403), unknown channel (404) or network error — keep
        // whatever is already on screen rather than wiping the feed.
      }
    }
    // Load my channel group keys once before the first decrypt, then poll. The
    // prepare is a no-op when the session is locked or the channel is plaintext.
    // Track whether a usable key exists so the UI shows the true E2E status.
    void e2eService.prepareChannelKeys(channelId, userId)
      .then(version => {
        if (cancelled) return
        setE2eReadyChannels(prev => {
          const next = new Set(prev)
          if (version !== null) next.add(channelId)
          else next.delete(channelId)
          return next
        })
      })
      .finally(() => { if (!cancelled) void load() })
    const id = setInterval(() => void load(), ACTIVE_CHANNEL_POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [currentUser, activeChannelId, updateChannel])

  const setActiveSpace = useCallback((id: string | null) => {
    setActiveSpaceId(id)
    setActiveChannelId(null)
    setActiveConversationId(null)
  }, [])

  const setActiveChannel = useCallback((id: string) => {
    setActiveChannelId(id)
    setActiveConversationId(null)
  }, [])

  const setActiveConversation = useCallback((id: string) => {
    setActiveConversationId(id)
    setActiveChannelId(null)
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c)
    )
    // Persist read state server-side; id is the sender/partner user id.
    messageService.markAllRead(id).catch(() => { /* will retry on next open */ })
  }, [])

  const toggleUserList = useCallback(() => setShowUserList(v => !v), [])

  // conversationId == the partner user id in the 1:1 DM model.
  const sendDM = useCallback(async (conversationId: string, body: string) => {
    if (!currentUser) return
    const optimistic = buildMessage(currentUser.id, conversationId, body)
    setConversations(prev => upsertConversationMessage(prev, conversationId, currentUser.id, optimistic))

    try {
      // Encrypt for the recipient if E2E is ready; otherwise send plaintext.
      const wire = await encryptDmBody(conversationId, body)
      const sent = await messageService.send(conversationId, wire)
      const d = decryptDmBody(sent.body)
      const real = { ...toUiMessage(sent, conversationId), encrypted: d.encrypted, body: d.text }
      setConversations(prev => prev.map(c => c.id === conversationId
        ? { ...c, messages: c.messages.map(m => m.id === optimistic.id ? real : m), lastMessageAt: real.createdAt }
        : c))
    } catch {
      // Roll back the optimistic message on failure.
      setConversations(prev => prev.map(c => c.id === conversationId
        ? { ...c, messages: c.messages.filter(m => m.id !== optimistic.id) }
        : c))
    }
  }, [currentUser])

  // Send a channel message via the MessageService (the single source of truth
  // for channel messages). Append optimistically, then swap in the persisted
  // message on success or roll it back on failure — mirrors sendDM.
  const sendChannelMessage = useCallback(async (channelId: string, body: string) => {
    if (!currentUser) return
    const optimistic = buildMessage(currentUser.id, channelId, body)
    setSpaces(prev => mapChannelMessages(prev, channelId, msgs => [...msgs, optimistic]))

    try {
      // Encrypt with the channel group key if one is loaded; else plaintext.
      const wire = encryptChannelBody(channelId, body)
      const sent = await messageService.sendChannelMessage(channelId, wire)
      const d = decryptChannelBody(channelId, sent.body)
      const real = { ...toUiMessage(sent, channelId), encrypted: d.encrypted, body: d.text }
      setSpaces(prev => mapChannelMessages(prev, channelId, msgs =>
        msgs.map(m => m.id === optimistic.id ? real : m)))
    } catch {
      // Roll back the optimistic message on failure (not a member, network, …).
      setSpaces(prev => mapChannelMessages(prev, channelId, msgs =>
        msgs.filter(m => m.id !== optimistic.id)))
    }
  }, [currentUser])

  // Compute the new participant list from current state, update locally, then
  // persist just that field via a shallow merge PATCH so the rest of the channel
  // object is untouched. The setSpaces updater stays pure; the PATCH is fired
  // from the computed result, not from inside the updater.
  const setVoiceParticipants = useCallback((channelId: string, next: (ids: string[]) => string[]) => {
    setSpaces(prev => {
      let ids: string[] | null = null
      const updated = prev.map(space => ({
        ...space,
        categories: space.categories.map(cat => ({
          ...cat,
          channels: cat.channels.map(ch => {
            if (ch.id !== channelId) return ch
            ids = next(ch.voiceParticipantIds ?? [])
            return { ...ch, voiceParticipantIds: ids }
          }),
        })),
      }))
      if (ids) {
        void objectService.patch<ChannelData>('channels', channelId, {
          data: { voiceParticipantIds: ids }, merge: true,
        }).catch(() => { /* best effort; local state already updated */ })
      }
      return updated
    })
  }, [])

  const joinVoiceChannel = useCallback((channelId: string) => {
    if (!currentUser) return
    setVoiceParticipants(channelId, ids =>
      ids.includes(currentUser.id) ? ids : [...ids, currentUser.id])
  }, [currentUser, setVoiceParticipants])

  const leaveVoiceChannel = useCallback((channelId: string) => {
    if (!currentUser) return
    setVoiceParticipants(channelId, ids => ids.filter(id => id !== currentUser.id))
  }, [currentUser, setVoiceParticipants])

  const getUser = useCallback((id: string) => users.find(u => u.id === id), [users])

  const getChannel = useCallback((id: string): Channel | undefined => {
    for (const space of spaces) {
      for (const cat of space.categories) {
        const ch = cat.channels.find(c => c.id === id)
        if (ch) return ch
      }
    }
    return undefined
  }, [spaces])

  const getConversation = useCallback((id: string) =>
    conversations.find(c => c.id === id), [conversations])

  const channelE2EReady = useCallback((id: string) =>
    e2eReadyChannels.has(id), [e2eReadyChannels])

  // Set default logged-in user on mount (demo convenience)
  const value: AppContextType = {
    currentUser, isAuthLoading, checkEmail, login, register, logout, refreshProfile,
    users, spaces, conversations, messangerProfile, e2eUnlocked, channelE2EReady, reloadSpaces: loadSpaces,
    activeSpaceId, activeChannelId, activeConversationId,
    setActiveSpace, setActiveChannel, setActiveConversation,
    showUserList, toggleUserList,
    sendDM, sendChannelMessage, joinVoiceChannel, leaveVoiceChannel,
    getUser, getChannel, getConversation,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
