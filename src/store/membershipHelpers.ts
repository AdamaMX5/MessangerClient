import { objectService } from '../services/objectService'
import type { MessangerProfile } from '../services/profileService'
import type { SpaceData, ChannelData } from './spacesHelpers'

// Sequentially sweep every space and its channels — one request in flight at a
// time — to find all channels where `userId` is listed in `memberIds`. The scan
// is intentionally serial (not Promise.all) so a reconcile in the background
// never floods the ObjectService. A user counts as a space member if the space
// itself lists them or they belong to at least one of its channels.
export async function scanMemberships(userId: string): Promise<MessangerProfile> {
  const spaces = await objectService.list<SpaceData>('spaces', { limit: 100 })
  const spaceIds: string[] = []
  const channelIds: string[] = []

  for (const space of spaces) {
    const channels = await objectService.list<ChannelData>('channels', {
      ref: { spaceId: space.id }, limit: 200,
    })
    let memberOfSpace = (space.data.memberIds ?? []).includes(userId)
    for (const ch of channels) {
      if ((ch.data.memberIds ?? []).includes(userId)) {
        channelIds.push(ch.id)
        memberOfSpace = true
      }
    }
    if (memberOfSpace) spaceIds.push(space.id)
  }

  return { spaceIds, channelIds }
}

// Order-independent equality of two membership snapshots, used to skip a profile
// write when the reconcile found nothing new.
export function sameMembership(a: MessangerProfile, b: MessangerProfile): boolean {
  return sameSet(a.spaceIds, b.spaceIds) && sameSet(a.channelIds, b.channelIds)
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const seen = new Set(a)
  return b.every(x => seen.has(x))
}
