import type { TcuActivity } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export interface TcuFilters {
  traineeId?: string
}

function applyFilters(activities: TcuActivity[], filters: TcuFilters): TcuActivity[] {
  return activities.filter((a) => {
    if (filters.traineeId && a.traineeId !== filters.traineeId) return false
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
    const scoped = applyScope('tcu', scope, activities, state)
    return applyFilters(scoped, filters)
  },
}
