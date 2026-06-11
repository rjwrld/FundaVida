import type { EmailCampaign } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export const emailCampaignsApi = {
  async list(): Promise<EmailCampaign[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const campaigns = state.emailCampaigns
    const scope = scopeFor(role)['bulkEmail']
    const scoped = applyScope('emailCampaigns', scope, campaigns)
    return scoped
  },
}
