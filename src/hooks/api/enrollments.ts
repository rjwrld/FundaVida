import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { EnrollmentFilters } from '@/data/api/enrollments'
import { makeEntityMutation } from './makeEntityMutation'
import { ENROLLMENTS_KEY } from './queryKeys'

export function useEnrollments(filters: EnrollmentFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...ENROLLMENTS_KEY, role, filters],
    queryFn: () => api.enrollments.list(filters),
  })
}

export const useDeleteEnrollment = makeEntityMutation('unenrollStudent')({
  toastKey: 'toasts.unenrolled',
})

export const useApproveEnrollment = makeEntityMutation('approveEnrollment')({
  toastKey: 'toasts.enrollmentApproved',
})

export const useRejectEnrollment = makeEntityMutation('rejectEnrollment')({
  toastKey: 'toasts.enrollmentRejected',
})
