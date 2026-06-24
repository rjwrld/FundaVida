import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import type { EmailFilter } from '@/types'
import { makeEntityMutation } from './makeEntityMutation'

const EMAIL_CAMPAIGNS_KEY = ['emailCampaigns'] as const

export function useEmailCampaigns() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...EMAIL_CAMPAIGNS_KEY, role],
    queryFn: () => api.emailCampaigns.list(),
  })
}

export const useSendEmailCampaign = makeEntityMutation<{
  subject: string
  body: string
  filter: EmailFilter
  recipientIds: string[]
}>({
  method: 'sendEmailCampaign',
  toastKey: 'toasts.campaignSent',
  invalidates: [EMAIL_CAMPAIGNS_KEY],
})
