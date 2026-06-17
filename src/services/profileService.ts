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

export type GlobalProfileInput = Partial<GlobalProfile>
export type VirtualOfficeProfileInput = Partial<VirtualOfficeProfile>

const GLOBAL_FIELDS = 'displayName firstName lastName avatar email phone address matrixUsername'
const VO_FIELDS = 'role department title status availability workingHours vacationPeriods'

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
}
