import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { User, UserRole, UserStatus, Space, Conversation, Channel, Message } from '../types'
import {
  MOCK_USERS, MOCK_SPACES, MOCK_CONVERSATIONS,
  LOGGED_IN_USER_ID,
  buildMessage,
} from '../data/mockData'
import { authService } from '../services/authService'
import { profileService } from '../services/profileService'
import { clearAccessToken } from '../services/tokenStore'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000

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
  sendDM: (conversationId: string, body: string) => void
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
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

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
  }, [])

  const toggleUserList = useCallback(() => setShowUserList(v => !v), [])

  const sendDM = useCallback((conversationId: string, body: string) => {
    if (!currentUser) return
    const msg = buildMessage(currentUser.id, conversationId, body)
    setConversations(prev => prev.map(c =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, msg], lastMessageAt: msg.createdAt }
        : c
    ))
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
