import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { EmailFilter } from '@/types'

const EMAIL_CAMPAIGNS_KEY = ['emailCampaigns'] as const

export function useEmailCampaigns() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...EMAIL_CAMPAIGNS_KEY, role],
    queryFn: () => api.emailCampaigns.list(),
  })
}

export function useSendEmailCampaign() {
  const client = useQueryClient()
  const sendEmailCampaign = useStore((s) => s.sendEmailCampaign)
  return useMutation({
    mutationFn: async (input: {
      subject: string
      body: string
      filter: EmailFilter
      recipientIds: string[]
    }) => sendEmailCampaign(input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: EMAIL_CAMPAIGNS_KEY })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
  })
}
