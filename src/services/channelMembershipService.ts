import { request } from './httpClient'

const BASE = import.meta.env.VITE_MESSAGE_SERVICE_URL ?? 'https://message.freischule.info'

// Authoritative membership snapshot of a channel as enforced by the
// MessageService. `memberIds` may read channel content; `adminIds` may manage
// membership (add/remove members, promote/demote admins). The channel creator
// (`createdBy`) is a permanent admin and cannot be removed or demoted (server
// returns 409). See MSArchitecture/MessageService.md "Channel-Mitgliedschaft".
export interface ChannelMembership {
  memberIds: string[]
  adminIds: string[]
}

// Membership is managed server-side: the MessageService authorizes every call
// (ChannelAdmin / Service-Admin / Self-Leave) and persists the result back to
// the ObjectService via its own API key. The client therefore never writes
// `channels.data.memberIds` directly for these operations — it goes through
// these endpoints so the ACL is enforced rather than UI-only (issue #6).
// Path segments are server-generated ObjectService ids today, but encode them
// defensively so an unexpected id shape can never break out of the URL path.
const enc = encodeURIComponent

export const channelMembershipService = {
  getMembers(channelId: string): Promise<ChannelMembership> {
    return request<ChannelMembership>(`${BASE}/channels/${enc(channelId)}/members`)
  },

  // Add a member (idempotent). Requires ChannelAdmin or Service-Admin.
  addMember(channelId: string, userId: string): Promise<ChannelMembership> {
    return request<ChannelMembership>(`${BASE}/channels/${enc(channelId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  },

  // Remove a member. Allowed for ChannelAdmin / Service-Admin, or for any
  // member removing themselves (self-leave).
  removeMember(channelId: string, userId: string): Promise<ChannelMembership> {
    return request<ChannelMembership>(`${BASE}/channels/${enc(channelId)}/members/${enc(userId)}`, {
      method: 'DELETE',
    })
  },

  // Promote a member to ChannelAdmin (idempotent). Requires ChannelAdmin or
  // Service-Admin.
  addAdmin(channelId: string, userId: string): Promise<ChannelMembership> {
    return request<ChannelMembership>(`${BASE}/channels/${enc(channelId)}/admins`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  },

  // Demote a ChannelAdmin back to a plain member. Requires ChannelAdmin or
  // Service-Admin; the creator cannot be demoted (409).
  removeAdmin(channelId: string, userId: string): Promise<ChannelMembership> {
    return request<ChannelMembership>(`${BASE}/channels/${enc(channelId)}/admins/${enc(userId)}`, {
      method: 'DELETE',
    })
  },
}
