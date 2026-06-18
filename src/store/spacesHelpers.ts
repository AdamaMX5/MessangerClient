import type {
  Space, Channel, ChannelCategory, ChannelType,
  FaqItem, OnBoardingStep, Message, ForumPost,
} from '../types'
import type { StoredObject } from '../services/objectService'

// ─── ObjectService payload shapes (the `data` field of each stored object) ────

export interface SpaceData {
  name: string
  abbreviation: string
  memberIds: string[]
}

export interface ChannelData {
  spaceId: string
  categoryName: string
  name: string
  type: ChannelType
  description?: string
  isEncrypted: boolean
  isPublic: boolean
  memberIds: string[]
  voiceParticipantIds?: string[]
  faqItems?: FaqItem[]
  onboardingSteps?: OnBoardingStep[]
  // Transitional embedded channel-message store (see AppContext.sendChannelMessage).
  messages?: Message[]
}

export interface ForumPostData {
  channelId: string
  authorId: string
  title: string
  body: string
  createdAt: string
  pinned?: boolean
  tags?: string[]
  replies: Message[]
}

// Map a stored channel object to the UI Channel shape the components consume.
function toChannel(obj: StoredObject<ChannelData>): Channel {
  const d = obj.data
  return {
    id: obj.id,
    spaceId: d.spaceId,
    name: d.name,
    type: d.type,
    description: d.description,
    isEncrypted: d.isEncrypted,
    isPublic: d.isPublic,
    memberIds: d.memberIds ?? [],
    messages: d.messages ?? [],
    voiceParticipantIds: d.voiceParticipantIds,
    faqItems: d.faqItems,
    onboardingSteps: d.onboardingSteps,
  }
}

// Group channels into categories by `categoryName`, preserving first-seen order
// (the order the ObjectService returned them). The category id is derived from
// the name so collapse-state in the UI stays stable across reloads.
export function groupChannels(objs: StoredObject<ChannelData>[]): ChannelCategory[] {
  const order: string[] = []
  const byName = new Map<string, Channel[]>()
  for (const obj of objs) {
    const cat = obj.data.categoryName || 'Allgemein'
    if (!byName.has(cat)) { byName.set(cat, []); order.push(cat) }
    byName.get(cat)!.push(toChannel(obj))
  }
  return order.map(name => ({
    id: `cat-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    channels: byName.get(name)!,
  }))
}

// Assemble a UI Space from its stored space object + already-grouped categories.
export function toSpace(
  obj: StoredObject<SpaceData>,
  categories: ChannelCategory[],
): Space {
  return {
    id: obj.id,
    name: obj.data.name,
    abbreviation: obj.data.abbreviation,
    memberIds: obj.data.memberIds ?? [],
    categories,
  }
}

export function toForumPost(obj: StoredObject<ForumPostData>): ForumPost {
  const d = obj.data
  return {
    id: obj.id,
    channelId: d.channelId,
    authorId: d.authorId,
    title: d.title,
    body: d.body,
    createdAt: d.createdAt,
    replies: d.replies ?? [],
    pinned: d.pinned,
    tags: d.tags,
  }
}
