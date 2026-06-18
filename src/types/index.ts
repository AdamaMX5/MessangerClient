export type UserStatus = 'online' | 'away' | 'dnd' | 'offline';
export type UserRole = 'admin' | 'employee' | 'channel-admin' | 'channel-assistant' | 'customer';
export type ChannelType = 'text' | 'voice' | 'video' | 'forum' | 'onboarding' | 'faq' | 'stage' | 'announcement';

export interface User {
  id: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  email: string;
  roles: UserRole[];
}

export interface Message {
  id: string;
  senderId: string;
  channelId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface ForumPost {
  id: string;
  channelId: string;
  authorId: string;
  title: string;
  body: string;
  createdAt: string;
  replies: Message[];
  pinned?: boolean;
  tags?: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  authorId: string;
}

export interface OnBoardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export interface Channel {
  id: string;
  spaceId: string;
  name: string;
  type: ChannelType;
  description?: string;
  isEncrypted: boolean;
  isPublic: boolean;
  messages: Message[];
  posts?: ForumPost[];
  faqItems?: FaqItem[];
  onboardingSteps?: OnBoardingStep[];
  voiceParticipantIds?: string[];
  memberIds: string[];
  keyVersion?: number;
}

export interface ChannelCategory {
  id: string;
  name: string;
  channels: Channel[];
}

export interface Space {
  id: string;
  name: string;
  abbreviation: string;
  categories: ChannelCategory[];
  memberIds: string[];
}

export interface Conversation {
  id: string;
  participantIds: string[];
  messages: Message[];
  unreadCount: number;
  isGroup: boolean;
  name?: string;
  lastMessageAt: string;
  // Display data for the DM partner, resolved from ProfileService for users
  // that are not part of the static demo user list. Optional so mock group
  // conversations remain valid.
  partnerName?: string;
  partnerAvatarUrl?: string;
  // True while the active conversation's full history is being (re)loaded.
  isLoading?: boolean;
}
