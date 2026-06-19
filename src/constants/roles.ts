import type { UserRole } from '../types'

// Roles allowed to create/manage spaces and channels. plan.md restricts these
// actions to `admin`; issue #1 additionally names "Chefs und Moderatoren". There
// is no dedicated role for either, so `channel-admin` (Abteilungsleiter ≈ "Chef")
// is included as the closest match; "Moderator" has no role equivalent yet (see
// issue #7). Kept as a single shared list so the gating can be adjusted in one
// place and stays consistent across AppSidebar (spaces) and ChannelSidebar.
export const SPACE_CHANNEL_MANAGE_ROLES: UserRole[] = ['admin', 'channel-admin']
