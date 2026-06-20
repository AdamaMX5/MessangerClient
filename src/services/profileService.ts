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
}
