import type { TcuActivity } from '@/types'
import { scopedList } from './scopedRead'

export interface TcuFilters {
  traineeId?: string
}

// Every reader (the dashboard's recent list, the activity log) wants the newest
// work first, so the order is fixed once here rather than in each component. ISO
// dates compare chronologically as strings.
function applyFilters(activities: TcuActivity[], filters: TcuFilters): TcuActivity[] {
  return activities
    .filter((a) => {
      if (filters.traineeId && a.traineeId !== filters.traineeId) return false
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

// Activities read the `tcuActivities` slice (not `tcu`) — the deviant slice is
// declared in the RESOURCE_READ registry, so this delegation stays uniform.
export const tcuApi = {
  list(filters: TcuFilters = {}): Promise<TcuActivity[]> {
    return scopedList('tcu', filters, applyFilters)
  },
}
