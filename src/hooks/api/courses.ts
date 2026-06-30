import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { Course } from '@/types'
import type { CourseFilters } from '@/data/api/courses'
import { makeEntityMutation } from './makeEntityMutation'

const COURSES_KEY = ['courses'] as const
const courseKey = (id: string) => ['courses', id] as const

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
    queryKey: ['courses', 'browseable', id, role],
    queryFn: () => api.courses.get(id, 'openForEnrollment'),
    enabled: enabled && id.length > 0,
  })
}

export const useCreateCourse = makeEntityMutation('createCourse')({
  toastKey: 'toasts.courseCreated',
  invalidates: [COURSES_KEY],
})

export const useUpdateCourse = makeEntityMutation('updateCourse')<{
  id: string
  patch: Partial<Course>
}>({
  toastKey: 'toasts.courseUpdated',
  invalidates: ({ id }) => [COURSES_KEY, courseKey(id)],
  args: ({ id, patch }) => [id, patch],
})

export const useDeleteCourse = makeEntityMutation('deleteCourse')({
  toastKey: 'toasts.courseDeleted',
  invalidates: [
    COURSES_KEY,
    ['enrollments'],
    ['grades'],
    ['certificates'],
    ['students'],
    ['teachers'],
    ['attendance'],
  ],
})

export const useEnrollStudent = makeEntityMutation('enrollStudent')<{
  studentId: string
  courseId: string
}>({
  toastKey: 'toasts.enrolled',
  // ['enrollments'] so the Course detail roster (which reads the scoped
  // enrollments query, ADR-0012) refetches after enrolling.
  invalidates: [COURSES_KEY, ['students'], ['enrollments']],
  args: ({ studentId, courseId }) => [studentId, courseId],
})

export const useUnenrollStudent = makeEntityMutation('unenrollStudent')({
  toastKey: 'toasts.unenrolled',
  invalidates: [
    COURSES_KEY,
    ['students'],
    ['enrollments'],
    ['grades'],
    ['certificates'],
    ['attendance'],
  ],
})

export const useSetGrade = makeEntityMutation('setGrade')<{
  studentId: string
  courseId: string
  score: number
}>({
  toastKey: 'toasts.gradeSaved',
  // ['grades'] so the Course detail roster (scoped grades query, ADR-0012) shows
  // the saved score without a manual refresh. Saving a Grade no longer touches
  // Certificates — those are emitted when the Course is closed (ADR-0024).
  invalidates: [COURSES_KEY, ['students'], ['grades']],
  args: ({ studentId, courseId, score }) => [studentId, courseId, score],
})

export const useRequestEnrollment = makeEntityMutation('requestEnrollment')<{
  studentId: string
  courseId: string
}>({
  toastKey: 'toasts.enrollmentRequested',
  // Invalidates: the courses queries (browse list uses openForEnrollment scope and
  // shows browseable courses excluding pending requests), the enrollments query
  // (student may see their pending requests), and dashboards (ADR-0016).
  invalidates: [COURSES_KEY, ['enrollments'], ['dashboards']],
  args: ({ studentId, courseId }) => [studentId, courseId],
})

export const useWithdrawEnrollmentRequest = makeEntityMutation('withdrawEnrollmentRequest')({
  toastKey: 'toasts.requestWithdrawn',
  // Invalidates: the courses queries (course becomes browseable again), enrollments,
  // and dashboards (ADR-0016).
  invalidates: [COURSES_KEY, ['enrollments'], ['dashboards']],
})

export const usePublishCourse = makeEntityMutation('publishCourse')<{ courseId: string }>({
  toastKey: 'toasts.coursePublished',
  // Invalidates the courses list (course status changed) and the specific course detail.
  invalidates: ({ courseId }) => [COURSES_KEY, courseKey(courseId)],
  args: ({ courseId }) => [courseId],
})

export const useCloseCourse = makeEntityMutation('closeCourse')<{ courseId: string }>({
  toastKey: 'toasts.courseClosed',
  // Closing flips status to 'closed' AND emits the cohort's Certificates (ADR-0024),
  // so invalidate the courses list + this course's detail (new status), ['certificates']
  // (the new certs surface in the gallery and the in-course section), and ['students']
  // (a Student's own-certificates view refetches).
  invalidates: ({ courseId }) => [COURSES_KEY, courseKey(courseId), ['certificates'], ['students']],
  args: ({ courseId }) => [courseId],
})
