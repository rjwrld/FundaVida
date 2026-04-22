import type { EmailCampaign } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

function applyRoleFilter(campaigns: EmailCampaign[]): EmailCampaign[] {
  const role = useStore.getState().role
  if (role === 'admin') return campaigns
  return []
}

export const emailCampaignsApi = {
  async list(): Promise<EmailCampaign[]> {
    await delay()
    return applyRoleFilter(useStore.getState().emailCampaigns)
  },
}
