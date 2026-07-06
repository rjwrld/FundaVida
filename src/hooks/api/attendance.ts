import { useQuery } from '@tanstack/react-query'
import type { AttendanceRecord } from '@/types'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { AttendanceFilters } from '@/data/api/attendance'
import { makeEntityMutation } from './makeEntityMutation'
import { ATTENDANCE_KEY } from './queryKeys'

export function useAttendance(filters: AttendanceFilters = {}) {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, role, userId, filters],
    queryFn: () => api.attendance.list(filters),
  })
}

export const useMarkAttendance = makeEntityMutation('markAttendance')<{
  courseId: string
  studentId: string
  sessionDate: string
  status: AttendanceRecord['status']
}>({
  toastKey: 'toasts.attendanceMarked',
  args: ({ courseId, studentId, sessionDate, status }) => [
    courseId,
    studentId,
    sessionDate,
    status,
  ],
})

export const useMarkSessionAttendance = makeEntityMutation('markSessionAttendance')<{
  courseId: string
  sessionDate: string
  attendanceByStudentId: Record<string, AttendanceRecord['status']>
}>({
  toastKey: 'toasts.sessionAttendanceMarked',
  args: ({ courseId, sessionDate, attendanceByStudentId }) => [
    courseId,
    sessionDate,
    attendanceByStudentId,
  ],
})
