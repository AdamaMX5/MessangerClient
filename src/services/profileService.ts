import { graphqlRequest } from './httpClient'

const BASE = import.meta.env.VITE_PROFILE_SERVICE_URL ?? 'https://profile.freischule.info'

export interface GlobalProfile {
  displayName: string
  firstName: string
  lastName: string
  avatar: string
  email: string
  phone: string
  address: string
  matrixUsername: string
}

export interface VirtualOfficeProfile {
  role: string
  department: string
  title: string
  status: string
  availability: string
  workingHours: string
  vacationPeriods: string[]
}

// App-specific MessengerClient profile. Acts as a fast-start cache of the user's
// space and channel memberships so the UI does not have to sweep every space on
// login. The ObjectService (`spaces`/`channels`) stays the source of truth; this
// profile is reconciled against it in the background (see membershipHelpers).
export interface MessangerProfile {
  spaceIds: string[]
  channelIds: string[]
}

export type GlobalProfileInput = Partial<GlobalProfile>
export type VirtualOfficeProfileInput = Partial<VirtualOfficeProfile>
export type MessangerProfileInput = Partial<MessangerProfile>

const GLOBAL_FIELDS = 'displayName firstName lastName avatar email phone address matrixUsername'
const VO_FIELDS = 'role department title status availability workingHours vacationPeriods'
const MESSANGER_FIELDS = 'spaceIds channelIds'

export const profileService = {
  async myGlobalProfile(): Promise<GlobalProfile> {
    const data = await graphqlRequest<{ myGlobalProfile: GlobalProfile }>(
      BASE,
      `query { myGlobalProfile { ${GLOBAL_FIELDS} } }`,
    )
    return data.myGlobalProfile
  },

  async globalProfile(userId: string): Promise<GlobalProfile> {
    const data = await graphqlRequest<{ globalProfile: GlobalProfile }>(
      BASE,
      `query GlobalProfile($userId: ID!) { globalProfile(userId: $userId) { ${GLOBAL_FIELDS} } }`,
      { userId },
    )
    return data.globalProfile
  },

  async myVirtualOfficeProfile(): Promise<VirtualOfficeProfile> {
    const data = await graphqlRequest<{ myVirtualOfficeProfile: VirtualOfficeProfile }>(
      BASE,
      `query { myVirtualOfficeProfile { ${VO_FIELDS} } }`,
    )
    return data.myVirtualOfficeProfile
  },

  async updateGlobalProfile(input: GlobalProfileInput): Promise<GlobalProfile> {
    const data = await graphqlRequest<{ updateGlobalProfile: GlobalProfile }>(
      BASE,
      `mutation Update($input: GlobalProfileInput!) { updateGlobalProfile(input: $input) { ${GLOBAL_FIELDS} } }`,
      { input },
    )
    return data.updateGlobalProfile
  },

  async updateVirtualOfficeProfile(input: VirtualOfficeProfileInput): Promise<VirtualOfficeProfile> {
    const data = await graphqlRequest<{ updateVirtualOfficeProfile: VirtualOfficeProfile }>(
      BASE,
      `mutation Update($input: VirtualOfficeProfileInput!) { updateVirtualOfficeProfile(input: $input) { ${VO_FIELDS} } }`,
      { input },
    )
    return data.updateVirtualOfficeProfile
  },

  async myMessangerProfile(): Promise<MessangerProfile> {
    const data = await graphqlRequest<{ myMessangerProfile: MessangerProfile }>(
      BASE,
      `query { myMessangerProfile { ${MESSANGER_FIELDS} } }`,
    )
    return data.myMessangerProfile
  },

  async updateMessangerProfile(input: MessangerProfileInput): Promise<MessangerProfile> {
    const data = await graphqlRequest<{ updateMessangerProfile: MessangerProfile }>(
      BASE,
      `mutation Update($input: MessangerProfileInput!) { updateMessangerProfile(input: $input) { ${MESSANGER_FIELDS} } }`,
      { input },
    )
    return data.updateMessangerProfile
  },

  // ─── E2E key material in the ChatProfil (MessangerProfile) ──────────────────
  // The personal E2E key lives in the user's app-specific MessangerProfile (the
  // "ChatProfil"), not in the GlobalProfile: it is chat-domain data, and other
  // apps (e.g. VirtualOffice) read a user's ChatProfil to obtain their public
  // key. `publicKey` is the Base64 X25519 public key; `keyBackup` is the
  // JSON-serialized, password-encrypted secret-key blob (see keyBackup.ts).
  //
  // These selections are isolated from the shared MESSANGER_FIELDS query: if the
  // backend does not expose the fields yet, only the E2E calls throw (caught by
  // e2eService) while the membership flow (spaceIds/channelIds) stays unaffected.

  // My own ChatProfil E2E fields (used to unlock or first-time provision).
  // `channelKeyring` is the password-encrypted blob of all my channel group keys
  // (all versions) for multi-device persistence (#14) — like keyBackup it must
  // only be readable on the own profile, never via messangerProfile(userId).
  async getMyE2EKeys(): Promise<{ publicKey: string | null; keyBackup: string | null; channelKeyring: string | null }> {
    const data = await graphqlRequest<{ myMessangerProfile: { publicKey?: string | null; keyBackup?: string | null; channelKeyring?: string | null } | null }>(
      BASE,
      `query { myMessangerProfile { publicKey keyBackup channelKeyring } }`,
    )
    return {
      publicKey: data.myMessangerProfile?.publicKey ?? null,
      keyBackup: data.myMessangerProfile?.keyBackup ?? null,
      channelKeyring: data.myMessangerProfile?.channelKeyring ?? null,
    }
  },

  // Publish my public key + encrypted backup into my own ChatProfil.
  async setMyE2EKeys(publicKey: string, keyBackup: string): Promise<void> {
    await graphqlRequest<{ updateMessangerProfile: { publicKey?: string | null } }>(
      BASE,
      `mutation SetE2E($input: MessangerProfileInput!) { updateMessangerProfile(input: $input) { publicKey } }`,
      { input: { publicKey, keyBackup } },
    )
  },

  // Persist the password-encrypted channel keyring into my own ChatProfil (#14).
  async setMyChannelKeyring(channelKeyring: string): Promise<void> {
    await graphqlRequest<{ updateMessangerProfile: { publicKey?: string | null } }>(
      BASE,
      `mutation SetKeyring($input: MessangerProfileInput!) { updateMessangerProfile(input: $input) { publicKey } }`,
      { input: { channelKeyring } },
    )
  },

  // Resolve another user's public key from their ChatProfil. Falls back to the
  // GlobalProfile if the ChatProfil-by-userId query is unavailable, so the
  // feature still works against a backend that only exposes the global field.
  async getPublicKey(userId: string): Promise<string | null> {
    try {
      const data = await graphqlRequest<{ messangerProfile: { publicKey?: string | null } | null }>(
        BASE,
        `query PubKey($userId: ID!) { messangerProfile(userId: $userId) { publicKey } }`,
        { userId },
      )
      return data.messangerProfile?.publicKey ?? null
    } catch {
      const data = await graphqlRequest<{ globalProfile: { publicKey?: string | null } | null }>(
        BASE,
        `query PubKeyG($userId: ID!) { globalProfile(userId: $userId) { publicKey } }`,
        { userId },
      )
      return data.globalProfile?.publicKey ?? null
    }
  },
}
