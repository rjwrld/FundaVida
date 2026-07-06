import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import { makeEntityMutation } from './makeEntityMutation'
import { TCU_KEY, TRAINEES_KEY } from './queryKeys'
import type { TcuFilters } from '@/data/api/tcu'

export function useTcuActivities(filters: TcuFilters = {}) {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...TCU_KEY, role, userId, filters],
    queryFn: () => api.tcu.list(filters),
  })
}

export function useTcuTrainees() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...TRAINEES_KEY, role],
    queryFn: () => api.trainees.list(),
  })
}

export const useLogTcuActivity = makeEntityMutation('logTcuActivity')({
  toastKey: 'toasts.tcuActivityLogged',
})

export const useApproveTcuActivity = makeEntityMutation('approveTcuActivity')<{
  activityId: string
  decision: 'approved' | 'rejected'
}>({
  toastKey: 'toasts.tcuActivityApproved',
  args: (vars) => [vars.activityId, vars.decision],
})
