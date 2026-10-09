import type { TcuActivity } from '@/types'
import { scopedList } from './scopedRead'

export interface TcuFilters {
  traineeId?: string
}

function applyFilters(activities: TcuActivity[], filters: TcuFilters): TcuActivity[] {
  return activities.filter((a) => {
    if (filters.traineeId && a.traineeId !== filters.traineeId) return false
    return true
  })
}

// Activities read the `tcuActivities` slice (not `tcu`) — the deviant slice is
// declared in the RESOURCE_READ registry, so this delegation stays uniform.
export const tcuApi = {
  list(filters: TcuFilters = {}): Promise<TcuActivity[]> {
    return scopedList('tcu', filters, applyFilters)
  },
}
