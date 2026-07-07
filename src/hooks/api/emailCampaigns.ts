import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import { makeEntityMutation } from './makeEntityMutation'
import { EMAIL_CAMPAIGNS_KEY } from './queryKeys'

export function useEmailCampaigns() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...EMAIL_CAMPAIGNS_KEY, role],
    queryFn: () => api.emailCampaigns.list(),
  })
}

export const useSendEmailCampaign = makeEntityMutation('sendEmailCampaign')({
  toastKey: 'toasts.campaignSent',
})
