import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { Course } from '@/types'
import type { CourseFilters } from '@/data/api/courses'
import { makeEntityMutation } from './makeEntityMutation'
import { COURSES_KEY } from './queryKeys'

const courseKey = (id: string) => [...COURSES_KEY, id] as const

// Role is captured in the queryKey so cache entries per role are isolated.
// When the role changes, Zustand triggers a re-render, React Query sees a new
// queryKey, and refetches with the new role applied via the API layer's
// role-aware filter.
export function useCourses(filters: CourseFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...COURSES_KEY, role, filters],
    queryFn: () => api.courses.list(filters),
  })
}

export function useCourse(id: string) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...courseKey(id), role],
    queryFn: () => api.courses.get(id),
    enabled: id.length > 0,
  })
}

export function useBrowseableCourse(id: string, enabled: boolean) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...COURSES_KEY, 'browseable', id, role],
    queryFn: () => api.courses.get(id, 'browseable'),
    enabled: enabled && id.length > 0,
  })
}

// Seats remaining for a Course, read through the data-layer aggregate seam so a
// Student never reads other students' raw enrollments (issue #166, ADR-0012). The
// key is prefixed ['courses'] so enrollment mutations (which invalidate the
// courses key) refresh the count.
export function useCourseSeats(id: string, enabled = true) {
  return useQuery({
    queryKey: [...COURSES_KEY, 'seats', id],
    queryFn: () => api.courses.seatsRemaining(id),
    enabled: enabled && id.length > 0,
  })
}

export const useCreateCourse = makeEntityMutation('createCourse')({
  toastKey: 'toasts.courseCreated',
})

export const useUpdateCourse = makeEntityMutation('updateCourse')<{
  id: string
  patch: Partial<Course>
}>({
  toastKey: 'toasts.courseUpdated',
  args: ({ id, patch }) => [id, patch],
})

export const useDeleteCourse = makeEntityMutation('deleteCourse')({
  toastKey: 'toasts.courseDeleted',
})

export const useEnrollStudent = makeEntityMutation('enrollStudent')<{
  studentId: string
  courseId: string
}>({
  toastKey: 'toasts.enrolled',
  args: ({ studentId, courseId }) => [studentId, courseId],
})

export const useUnenrollStudent = makeEntityMutation('unenrollStudent')({
  toastKey: 'toasts.unenrolled',
})

export const useSetGrade = makeEntityMutation('setGrade')<{
  studentId: string
  courseId: string
  score: number
}>({
  toastKey: 'toasts.gradeSaved',
  args: ({ studentId, courseId, score }) => [studentId, courseId, score],
})

export const useRequestEnrollment = makeEntityMutation('requestEnrollment')<{
  studentId: string
  courseId: string
}>({
  toastKey: 'toasts.enrollmentRequested',
  args: ({ studentId, courseId }) => [studentId, courseId],
})

export const useWithdrawEnrollmentRequest = makeEntityMutation('withdrawEnrollmentRequest')({
  toastKey: 'toasts.requestWithdrawn',
})

export const usePublishCourse = makeEntityMutation('publishCourse')<{ courseId: string }>({
  toastKey: 'toasts.coursePublished',
  args: ({ courseId }) => [courseId],
})

export const useCloseCourse = makeEntityMutation('closeCourse')<{ courseId: string }>({
  toastKey: 'toasts.courseClosed',
  args: ({ courseId }) => [courseId],
})
