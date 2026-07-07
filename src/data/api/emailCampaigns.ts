import type { EmailCampaign } from '@/types'
import { scopedList } from './scopedRead'

// Campaigns ride the `bulkEmail` token (not an `emailCampaigns` token — there
// isn't one): that deviation is declared in the RESOURCE_READ registry.
export const emailCampaignsApi = {
  list(): Promise<EmailCampaign[]> {
    return scopedList('emailCampaigns', {})
  },
}
