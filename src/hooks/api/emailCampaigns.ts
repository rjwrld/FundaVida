import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import type { EmailCampaign } from '@/types'
import { makeEntityMutation } from './makeEntityMutation'
import { EMAIL_CAMPAIGNS_KEY } from './queryKeys'

export function useEmailCampaigns() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...EMAIL_CAMPAIGNS_KEY, role],
    queryFn: () => api.emailCampaigns.list(),
  })
}

/**
 * The campaigns sent to one Course, newest-first (ADR-0046).
 *
 * Viewer-agnostic by construction: this only narrows by Course. The scope seam
 * underneath narrows by viewer — a teacher's `own` scope yields the class messages
 * they sent, an admin's `all` scope yields every campaign aimed at the Course,
 * including a teacher's. It rides `useEmailCampaigns`' query key, so a send
 * invalidates both surfaces at once (ADR-0029).
 */
export function useCourseCampaigns(courseId: string) {
  const role = useStore((s) => s.role)
  // Stable identity: react-query re-runs `select` whenever the function changes, so
  // an inline arrow would hand the card a fresh array on every render.
  const select = useCallback(
    (campaigns: EmailCampaign[]) =>
      // `.filter` hands `.sort` a fresh array, so the in-place sort never touches
      // the array react-query cached. Drop the filter and this mutates the cache.
      campaigns
        .filter((c) => c.filter.kind === 'course' && c.filter.value === courseId)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt)),
    [courseId]
  )
  return useQuery({
    queryKey: [...EMAIL_CAMPAIGNS_KEY, role],
    queryFn: () => api.emailCampaigns.list(),
    select,
  })
}

export const useSendEmailCampaign = makeEntityMutation('sendEmailCampaign')({
  toastKey: 'toasts.campaignSent',
})
