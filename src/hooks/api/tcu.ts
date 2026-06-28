import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import { makeEntityMutation } from './makeEntityMutation'
import type { TcuFilters } from '@/data/api/tcu'

const TCU_KEY = ['tcu'] as const
const TRAINEES_KEY = ['trainees'] as const

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
  invalidates: [TCU_KEY, TRAINEES_KEY],
})

export const useApproveTcuActivity = makeEntityMutation('approveTcuActivity')<{
  activityId: string
  decision: 'approved' | 'rejected'
}>({
  toastKey: 'toasts.tcuActivityApproved',
  invalidates: [TCU_KEY, TRAINEES_KEY],
  args: (vars) => [vars.activityId, vars.decision],
})
