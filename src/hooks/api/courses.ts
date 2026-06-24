import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore, type StoreState } from '@/data/store'
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
  return useQuery({
    queryKey: courseKey(id),
    queryFn: () => api.courses.get(id),
    enabled: id.length > 0,
  })
}

export const useCreateCourse = makeEntityMutation<Parameters<StoreState['createCourse']>[0]>({
  method: 'createCourse',
  toastKey: 'toasts.courseCreated',
  invalidates: [COURSES_KEY],
})

export const useUpdateCourse = makeEntityMutation<{ id: string; patch: Partial<Course> }>({
  method: 'updateCourse',
  toastKey: 'toasts.courseUpdated',
  invalidates: ({ id }) => [COURSES_KEY, courseKey(id)],
  args: ({ id, patch }) => [id, patch],
})

export const useDeleteCourse = makeEntityMutation<string>({
  method: 'deleteCourse',
  toastKey: 'toasts.courseDeleted',
  invalidates: [
    COURSES_KEY,
    ['enrollments'],
    ['grades'],
    ['students'],
    ['teachers'],
    ['attendance'],
  ],
})

export const useEnrollStudent = makeEntityMutation<{ studentId: string; courseId: string }>({
  method: 'enrollStudent',
  toastKey: 'toasts.enrolled',
  invalidates: [COURSES_KEY, ['students']],
  args: ({ studentId, courseId }) => [studentId, courseId],
})

export const useUnenrollStudent = makeEntityMutation<string>({
  method: 'unenrollStudent',
  toastKey: 'toasts.unenrolled',
  invalidates: [COURSES_KEY, ['students'], ['grades'], ['attendance']],
})

export const useSetGrade = makeEntityMutation<{
  studentId: string
  courseId: string
  score: number
}>({
  method: 'setGrade',
  toastKey: 'toasts.gradeSaved',
  invalidates: [COURSES_KEY, ['students']],
  args: ({ studentId, courseId, score }) => [studentId, courseId, score],
})
