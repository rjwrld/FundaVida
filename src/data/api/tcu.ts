import type { TcuActivity } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface TcuFilters {
  studentId?: string
  organizerId?: string
}

function applyRoleFilter(activities: TcuActivity[]): TcuActivity[] {
  const state = useStore.getState()
  const role = state.role
  if (role === 'admin') return activities
  if (role === 'student' && state.currentUserId) {
    return activities.filter((a) => a.studentId === state.currentUserId)
  }
  if (role === 'tcu' && state.currentUserId) {
    return activities.filter((a) => a.organizerId === state.currentUserId)
  }
  return []
}

function applyFilters(activities: TcuActivity[], filters: TcuFilters): TcuActivity[] {
  return activities.filter((a) => {
    if (filters.studentId && a.studentId !== filters.studentId) return false
    if (filters.organizerId && a.organizerId !== filters.organizerId) return false
    return true
  })
}

export const tcuApi = {
  async list(filters: TcuFilters = {}): Promise<TcuActivity[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().tcuActivities), filters)
  },
}
