import type { User } from '../types'

// Static demo user directory. ProfileService can only resolve a single profile
// via globalProfile(userId) — there is no "list all users" endpoint — so the
// app cannot enumerate the member directory from the backend. Until such an
// endpoint exists, this list stands in for the full user roster (used to render
// member lists, DM partner names, avatars, etc.). See "Bekannte Lücken" in CLAUDE.md.
export const MOCK_USERS: User[] = [
  { id: 'u1', displayName: 'Max Mustermann',    email: 'max@mustermann.de',  status: 'online',  roles: ['employee'],                        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max' },
  { id: 'u2', displayName: 'Sarah Schmidt',     email: 'sarah@firma.de',     status: 'online',  roles: ['employee', 'channel-admin'],        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: 'u3', displayName: 'Thomas Müller',     email: 'thomas@firma.de',    status: 'away',    roles: ['employee'],                        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas' },
  { id: 'u4', displayName: 'Lisa Weber',        email: 'lisa@firma.de',      status: 'online',  roles: ['employee', 'channel-admin'],        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa' },
  { id: 'u5', displayName: 'Peter Hoffmann',   email: 'peter@firma.de',     status: 'dnd',     roles: ['employee', 'channel-admin'],        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Peter' },
  { id: 'u6', displayName: 'Anna Fischer',      email: 'anna@firma.de',      status: 'offline', roles: ['employee'],                        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anna' },
  { id: 'u7', displayName: 'Klaus Zimmermann', email: 'klaus@firma.de',     status: 'online',  roles: ['admin', 'employee'],               avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Klaus' },
  { id: 'u8', displayName: 'Michael Braun',    email: 'michael@kunde.de',   status: 'online',  roles: ['customer'],                        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael' },
  { id: 'u9', displayName: 'Julia Becker',     email: 'julia@kunde.de',     status: 'away',    roles: ['customer'],                        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Julia' },
  { id: 'u10', displayName: 'Carla Rossi',     email: 'carla@messe.it',     status: 'online',  roles: ['customer'],                        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carla' },
]
