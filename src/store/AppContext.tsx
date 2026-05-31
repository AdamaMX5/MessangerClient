import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, Space, Conversation, Channel, Message } from '../types'
import {
  MOCK_USERS, MOCK_SPACES, MOCK_CONVERSATIONS,
  LOGGED_IN_USER_ID, MOCK_PASSWORD,
  createMockUser, buildMessage,
} from '../data/mockData'

interface AppContextType {
  // Auth
  currentUser: User | null
  checkEmail: (email: string) => 'login' | 'register'
  login: (email: string, password: string) => boolean
  register: (email: string, password: string, displayName: string) => void
  logout: () => void

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
  const [users, setUsers] = useState<User[]>(MOCK_USERS)
  const [spaces, setSpaces] = useState<Space[]>(MOCK_SPACES)
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null)
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [showUserList, setShowUserList] = useState(true)

  const checkEmail = useCallback((email: string): 'login' | 'register' => {
    return users.some(u => u.email.toLowerCase() === email.toLowerCase()) ? 'login' : 'register'
  }, [users])

  const login = useCallback((email: string, password: string): boolean => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) return false
    if (email.toLowerCase() === 'max@mustermann.de' && password !== MOCK_PASSWORD) return false
    setCurrentUser(user)
    return true
  }, [users])

  const register = useCallback((email: string, _password: string, displayName: string) => {
    const newUser = createMockUser(email, displayName)
    setUsers(prev => [...prev, newUser])
    setCurrentUser(newUser)
  }, [])

  const logout = useCallback(() => {
    setCurrentUser(null)
    setActiveSpaceId(null)
    setActiveChannelId(null)
    setActiveConversationId(null)
  }, [])

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
    currentUser, checkEmail, login, register, logout,
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
