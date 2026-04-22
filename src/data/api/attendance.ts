import type { AttendanceRecord } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface AttendanceFilters {
  studentId?: string
  courseId?: string
  status?: AttendanceRecord['status']
}

function applyRoleFilter(records: AttendanceRecord[]): AttendanceRecord[] {
  const state = useStore.getState()
  const role = state.role
  if (role === 'admin') return records
  if (role === 'teacher' && state.currentUserId) {
    const ownedCourseIds = new Set(
      state.courses.filter((c) => c.teacherId === state.currentUserId).map((c) => c.id)
    )
    return records.filter((r) => ownedCourseIds.has(r.courseId))
  }
  if (role === 'student' && state.currentUserId) {
    return records.filter((r) => r.studentId === state.currentUserId)
  }
  return []
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
    return applyFilters(applyRoleFilter(useStore.getState().attendance), filters)
  },
}
