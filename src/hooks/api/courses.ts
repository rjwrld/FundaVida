import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { Course } from '@/types'
import type { CourseFilters } from '@/data/api/courses'

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

export function useCreateCourse() {
  const client = useQueryClient()
  const createCourse = useStore((s) => s.createCourse)
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async (input: Parameters<typeof createCourse>[0]) => createCourse(input),
    onSuccess: () => {
      toast.success(t('toasts.courseCreated'))
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
    onError: (error) => {
      toast.error(
        t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
      )
    },
  })
}

export function useUpdateCourse() {
  const client = useQueryClient()
  const updateCourse = useStore((s) => s.updateCourse)
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Course> }) => {
      updateCourse(id, patch)
    },
    onSuccess: (_, { id }) => {
      toast.success(t('toasts.courseUpdated'))
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: courseKey(id) })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
    onError: (error) => {
      toast.error(
        t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
      )
    },
  })
}

export function useDeleteCourse() {
  const client = useQueryClient()
  const deleteCourse = useStore((s) => s.deleteCourse)
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async (id: string) => deleteCourse(id),
    onSuccess: () => {
      toast.success(t('toasts.courseDeleted'))
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: ['enrollments'] })
      client.invalidateQueries({ queryKey: ['grades'] })
      client.invalidateQueries({ queryKey: ['students'] })
      client.invalidateQueries({ queryKey: ['teachers'] })
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

export function useEnrollStudent() {
  const client = useQueryClient()
  const enrollStudent = useStore((s) => s.enrollStudent)
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async ({ studentId, courseId }: { studentId: string; courseId: string }) =>
      enrollStudent(studentId, courseId),
    onSuccess: () => {
      toast.success(t('toasts.enrolled'))
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
    onError: (error) => {
      toast.error(
        t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
      )
    },
  })
}

export function useUnenrollStudent() {
  const client = useQueryClient()
  const unenrollStudent = useStore((s) => s.unenrollStudent)
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async (enrollmentId: string) => unenrollStudent(enrollmentId),
    onSuccess: () => {
      toast.success(t('toasts.unenrolled'))
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
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

export function useSetGrade() {
  const client = useQueryClient()
  const setGrade = useStore((s) => s.setGrade)
  const { t } = useTranslation()
  return useMutation({
    mutationFn: async ({
      studentId,
      courseId,
      score,
    }: {
      studentId: string
      courseId: string
      score: number
    }) => setGrade(studentId, courseId, score),
    onSuccess: () => {
      toast.success(t('toasts.gradeSaved'))
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
    onError: (error) => {
      toast.error(
        t('toasts.error', { message: error instanceof Error ? error.message : String(error) })
      )
    },
  })
}
