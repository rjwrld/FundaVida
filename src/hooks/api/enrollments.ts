import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      unenrollStudent(enrollmentId)
    },
    onSuccess: () => {
      toast.success(t('toasts.unenrolled'))
      client.invalidateQueries({ queryKey: ENROLLMENTS_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
      client.invalidateQueries({ queryKey: ['courses'] })
      client.invalidateQueries({ queryKey: ['grades'] })
      client.invalidateQueries({ queryKey: ['attendance'] })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
    onError: (error) => {
      toast.error(
        t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
      )
    },
  })
}
