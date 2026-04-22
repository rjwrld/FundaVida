import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { AttendanceFilters } from '@/data/api/attendance'

const ATTENDANCE_KEY = ['attendance'] as const

export function useAttendance(filters: AttendanceFilters = {}) {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, role, userId, filters],
    queryFn: () => api.attendance.list(filters),
  })
}
