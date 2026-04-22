import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { EnrollmentFilters } from '@/data/api/enrollments'

const ENROLLMENTS_KEY = ['enrollments'] as const

export function useEnrollments(filters: EnrollmentFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...ENROLLMENTS_KEY, role, filters],
    queryFn: () => api.enrollments.list(filters),
  })
}

export function useDeleteEnrollment() {
  const client = useQueryClient()
  const unenrollStudent = useStore((s) => s.unenrollStudent)
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      unenrollStudent(enrollmentId)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ENROLLMENTS_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
      client.invalidateQueries({ queryKey: ['courses'] })
      client.invalidateQueries({ queryKey: ['grades'] })
      client.invalidateQueries({ queryKey: ['attendance'] })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
  })
}
