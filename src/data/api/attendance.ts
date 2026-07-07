import type { AttendanceRecord } from '@/types'
import { scopedList } from './scopedRead'

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
  list(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
    return scopedList('attendance', filters, applyFilters)
  },
}
