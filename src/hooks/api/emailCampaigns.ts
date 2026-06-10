import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const sendEmailCampaign = useStore((s) => s.sendEmailCampaign)
  return useMutation({
    mutationFn: async (input: {
      subject: string
      body: string
      filter: EmailFilter
      recipientIds: string[]
    }) => sendEmailCampaign(input),
    onSuccess: () => {
      toast.success(t('toasts.campaignSent'))
      client.invalidateQueries({ queryKey: EMAIL_CAMPAIGNS_KEY })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
    onError: (error) => {
      toast.error(
        t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
      )
    },
  })
}
