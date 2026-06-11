import type { AttendanceRecord } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export interface AttendanceFilters {
  studentId?: string
  courseId?: string
  status?: AttendanceRecord['status']
}

function applyFilters(records: AttendanceRecord[], filters: AttendanceFilters): AttendanceRecord[] {
  return records.filter((r) => {
    if (filters.studentId && r.studentId !== filters.studentId) return false
    if (filters.courseId && r.courseId !== filters.courseId) return false
    if (filters.status && r.status !== filters.status) return false
    return true
  })
}

export const attendanceApi = {
  async list(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const attendance = state.attendance
    const scope = scopeFor(role)['attendance']
    const scoped = applyScope('attendance', scope, attendance)
    return applyFilters(scoped, filters)
  },
}
