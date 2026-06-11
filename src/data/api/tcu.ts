import type { TcuActivity } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export interface TcuFilters {
  studentId?: string
  organizerId?: string
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
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const activities = state.tcuActivities
    const scope = scopeFor(role)['tcu']
    const scoped = applyScope('tcu', scope, activities)
    return applyFilters(scoped, filters)
  },
}
