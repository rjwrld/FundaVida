import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { TcuFilters } from '@/data/api/tcu'

const TCU_KEY = ['tcu'] as const

export function useTcuActivities(filters: TcuFilters = {}) {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...TCU_KEY, role, userId, filters],
    queryFn: () => api.tcu.list(filters),
  })
}
