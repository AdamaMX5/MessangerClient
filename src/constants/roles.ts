import type { UserRole } from '../types'

// Roles allowed to create/manage spaces and channels. plan.md restricts these
// actions to `admin`; issue #1 additionally names "Chefs und Moderatoren".
// `channel-admin` (Abteilungsleiter ≈ "Chef") and `moderator` (issue #7) cover
// those. Roles arrive from the AuthService JWT and are normalized to lower case
// in AppContext, so `MODERATOR` claims map onto `moderator` here automatically.
// Kept as a single shared list so the gating can be adjusted in one place and
// stays consistent across AppSidebar (spaces) and ChannelSidebar.
export const SPACE_CHANNEL_MANAGE_ROLES: UserRole[] = ['admin', 'moderator', 'channel-admin']
