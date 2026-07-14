import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { EnrollmentFilters } from '@/data/api/enrollments'
import type { Role } from '@/types'
import { makeEntityMutation } from './makeEntityMutation'
import { ENROLLMENTS_KEY } from './queryKeys'

/**
 * The scoped Enrollments read as options, so a prefetcher can warm exactly the
 * entry `useEnrollments` reads back — same rationale as `courseQueryOptions`.
 */
export function enrollmentsQueryOptions(filters: EnrollmentFilters, role: Role | null) {
  return {
    queryKey: [...ENROLLMENTS_KEY, role, filters],
    queryFn: () => api.enrollments.list(filters),
  }
}

export function useEnrollments(filters: EnrollmentFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery(enrollmentsQueryOptions(filters, role))
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
