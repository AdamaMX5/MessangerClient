import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { User, UserRole, UserStatus, Space, Conversation, Channel, Message } from '../types'
import {
  MOCK_USERS, MOCK_SPACES,
  LOGGED_IN_USER_ID,
  buildMessage,
} from '../data/mockData'
import { authService } from '../services/authService'
import { profileService } from '../services/profileService'
import { messageService } from '../services/messageService'
import { clearAccessToken } from '../services/tokenStore'
import { deriveConversations, toUiMessage, upsertConversationMessage } from './dmHelpers'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000
const CONVERSATION_LIST_POLL_MS = 15 * 1000
const ACTIVE_CONVERSATION_POLL_MS = 10 * 1000

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

// Merge JWT identity with the profile data into the UI User shape.
async function buildCurrentUser(token: string): Promise<User> {
  const jwt = decodeJwtPayload(token)
  const [global, vo] = await Promise.all([
    profileService.myGlobalProfile().catch(() => null),
    profileService.myVirtualOfficeProfile().catch(() => null),
  ])
  return {
    id: jwt.sub ?? '',
    email: jwt.email ?? global?.email ?? '',
    roles: (jwt.roles ?? []) as UserRole[],
    displayName: global?.displayName ?? jwt.email ?? '',
    avatarUrl: global?.avatar || undefined,
    status: (vo?.status as UserStatus) ?? 'online',
  }
}

interface AppContextType {
  // Auth
  currentUser: User | null
  isAuthLoading: boolean
  checkEmail: (email: string) => Promise<'login' | 'register'>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, repassword: string) => Promise<void>
  logout: () => Promise<void>

  // Data
  users: User[]
  spaces: Space[]
  conversations: Conversation[]

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
  sendChannelMessage: (channelId: string, body: string) => void
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
  const [spaces, setSpaces] = useState<Space[]>(MOCK_SPACES)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

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
    setCurrentUser(await buildCurrentUser(session.access_token))
  }, [])

  const register = useCallback(async (email: string, password: string, repassword: string): Promise<void> => {
    const session = await authService.registerComplete(email, password, repassword)
    setCurrentUser(await buildCurrentUser(session.access_token))
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
    const derived = deriveConversations(inbox, sent, userId)
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
        const uiMsgs = msgs.map(m => toUiMessage(m, partnerId))
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
      const sent = await messageService.send(conversationId, body)
      const real = toUiMessage(sent, conversationId)
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

  const sendChannelMessage = useCallback((channelId: string, body: string) => {
    if (!currentUser) return
    const msg = buildMessage(currentUser.id, channelId, body)
    setSpaces(prev => prev.map(space => ({
      ...space,
      categories: space.categories.map(cat => ({
        ...cat,
        channels: cat.channels.map(ch =>
          ch.id === channelId ? { ...ch, messages: [...ch.messages, msg] } : ch
        ),
      })),
    })))
  }, [currentUser])

  const joinVoiceChannel = useCallback((channelId: string) => {
    if (!currentUser) return
    setSpaces(prev => prev.map(space => ({
      ...space,
      categories: space.categories.map(cat => ({
        ...cat,
        channels: cat.channels.map(ch =>
          ch.id === channelId && !ch.voiceParticipantIds?.includes(currentUser.id)
            ? { ...ch, voiceParticipantIds: [...(ch.voiceParticipantIds ?? []), currentUser.id] }
            : ch
        ),
      })),
    })))
  }, [currentUser])

  const leaveVoiceChannel = useCallback((channelId: string) => {
    if (!currentUser) return
    setSpaces(prev => prev.map(space => ({
      ...space,
      categories: space.categories.map(cat => ({
        ...cat,
        channels: cat.channels.map(ch =>
          ch.id === channelId
            ? { ...ch, voiceParticipantIds: (ch.voiceParticipantIds ?? []).filter(id => id !== currentUser.id) }
            : ch
        ),
      })),
    })))
  }, [currentUser])

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

  // Set default logged-in user on mount (demo convenience)
  const value: AppContextType = {
    currentUser, isAuthLoading, checkEmail, login, register, logout,
    users, spaces, conversations,
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

// Pre-login helper — expose the known user for mockup convenience
export { LOGGED_IN_USER_ID, MOCK_USERS }
