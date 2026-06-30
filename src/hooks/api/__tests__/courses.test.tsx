import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  useEnrollStudent,
  useUnenrollStudent,
  useSetGrade,
} from '../courses'
import { useStore } from '@/data/store'
import type { Weekday } from '@/types'
import {
  clearPersistedState,
  clearPersistedRole,
  clearPersistedCurrentUser,
} from '@/data/persistence'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'toasts.error') {
        return `Error: ${options?.message || 'Unknown error'}`
      }
      return key
    },
  }),
}))

let queryClient: QueryClient

function createWrapper() {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCreateCourse', () => {
  beforeEach(() => {
    queryClient = new QueryClient()
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('fires success toast on successful course creation', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useCreateCourse(), { wrapper: createWrapper() })

    const teacher = useStore.getState().teachers[0]
    if (!teacher) throw new Error('expected at least one teacher')
    const input = {
      name: 'Test Course',
      description: 'A test course',
      sede: 'Linda Vista' as const,
      programId: 'prog-1',
      level: 'primaria' as const,
      status: 'published' as const,
      capacity: 20,
      teacherId: teacher.id,
      term: { start: '2026-06-15T06:00:00.000Z', end: '2026-08-15T06:00:00.000Z' },
      meetingDays: ['mon', 'wed'] as Weekday[],
    }

    await act(async () => {
      result.current.mutate(input)
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('toasts.courseCreated')
    })
  })

  it('fires error toast on course creation failure', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useCreateCourse(), { wrapper: createWrapper() })

    // Stub the store action to throw
    const originalCreateCourse = useStore.getState().createCourse
    useStore.setState({
      createCourse: () => {
        throw new Error('boom')
      },
    })

    const teacher = useStore.getState().teachers[0]
    if (!teacher) throw new Error('expected at least one teacher')
    const input = {
      name: 'Test Course',
      description: 'A test course',
      sede: 'Linda Vista' as const,
      programId: 'prog-1',
      level: 'primaria' as const,
      status: 'published' as const,
      capacity: 20,
      teacherId: teacher.id,
      term: { start: '2026-06-15T06:00:00.000Z', end: '2026-08-15T06:00:00.000Z' },
      meetingDays: ['mon', 'wed'] as Weekday[],
    }

    await act(async () => {
      result.current.mutate(input)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    expect(toast.error).toHaveBeenCalledWith('Error: boom')

    // Restore
    useStore.setState({ createCourse: originalCreateCourse })
  })
})

describe('useUpdateCourse', () => {
  beforeEach(() => {
    queryClient = new QueryClient()
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('fires success toast on successful course update', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useUpdateCourse(), { wrapper: createWrapper() })

    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected at least one course')
    const courseId = course.id

    await act(async () => {
      result.current.mutate({ id: courseId, patch: { name: 'Updated Name' } })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('toasts.courseUpdated')
    })
  })

  it('fires error toast on course update failure', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useUpdateCourse(), { wrapper: createWrapper() })

    const originalUpdateCourse = useStore.getState().updateCourse
    useStore.setState({
      updateCourse: () => {
        throw new Error('update failed')
      },
    })

    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected at least one course')
    const courseId = course.id

    await act(async () => {
      result.current.mutate({ id: courseId, patch: { name: 'Updated Name' } })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    expect(toast.error).toHaveBeenCalledWith('Error: update failed')

    useStore.setState({ updateCourse: originalUpdateCourse })
  })
})

describe('useDeleteCourse', () => {
  beforeEach(() => {
    queryClient = new QueryClient()
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('fires success toast on successful course deletion', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useDeleteCourse(), { wrapper: createWrapper() })

    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected at least one course')
    const courseId = course.id

    await act(async () => {
      result.current.mutate(courseId)
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('toasts.courseDeleted')
    })
  })

  it('fires error toast on course deletion failure', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useDeleteCourse(), { wrapper: createWrapper() })

    const originalDeleteCourse = useStore.getState().deleteCourse
    useStore.setState({
      deleteCourse: () => {
        throw new Error('delete failed')
      },
    })

    const course = useStore.getState().courses[0]
    if (!course) throw new Error('expected at least one course')
    const courseId = course.id

    await act(async () => {
      result.current.mutate(courseId)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    expect(toast.error).toHaveBeenCalledWith('Error: delete failed')

    useStore.setState({ deleteCourse: originalDeleteCourse })
  })
})

describe('useEnrollStudent', () => {
  beforeEach(() => {
    queryClient = new QueryClient()
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('fires success toast on successful student enrollment', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useEnrollStudent(), { wrapper: createWrapper() })

    const state = useStore.getState()
    const student = state.students[0]
    const course = state.courses[0]
    if (!student || !course) throw new Error('expected at least one student and one course')
    const studentId = student.id
    const courseId = course.id

    await act(async () => {
      result.current.mutate({ studentId, courseId })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('toasts.enrolled')
    })
  })

  it('invalidates the enrollments cache so the Course roster reflects the new enrollment', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useEnrollStudent(), { wrapper: createWrapper() })

    const state = useStore.getState()
    const student = state.students[0]
    const course = state.courses[0]
    if (!student || !course) throw new Error('expected at least one student and one course')

    await act(async () => {
      result.current.mutate({ studentId: student.id, courseId: course.id })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['enrollments'] })
  })

  it('fires error toast on student enrollment failure', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useEnrollStudent(), { wrapper: createWrapper() })

    const originalEnrollStudent = useStore.getState().enrollStudent
    useStore.setState({
      enrollStudent: () => {
        throw new Error('enroll failed')
      },
    })

    const state = useStore.getState()
    const student = state.students[0]
    const course = state.courses[0]
    if (!student || !course) throw new Error('expected at least one student and one course')
    const studentId = student.id
    const courseId = course.id

    await act(async () => {
      result.current.mutate({ studentId, courseId })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    expect(toast.error).toHaveBeenCalledWith('Error: enroll failed')

    useStore.setState({ enrollStudent: originalEnrollStudent })
  })
})

describe('useUnenrollStudent', () => {
  beforeEach(() => {
    queryClient = new QueryClient()
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('fires success toast on successful student unenrollment', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useUnenrollStudent(), { wrapper: createWrapper() })

    const enrollment = useStore.getState().enrollments[0]
    if (!enrollment) throw new Error('expected at least one enrollment')
    const enrollmentId = enrollment.id

    await act(async () => {
      result.current.mutate(enrollmentId)
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('toasts.unenrolled')
    })
  })

  it('fires error toast on student unenrollment failure', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useUnenrollStudent(), { wrapper: createWrapper() })

    const originalUnenrollStudent = useStore.getState().unenrollStudent
    useStore.setState({
      unenrollStudent: () => {
        throw new Error('unenroll failed')
      },
    })

    const enrollment = useStore.getState().enrollments[0]
    if (!enrollment) throw new Error('expected at least one enrollment')
    const enrollmentId = enrollment.id

    await act(async () => {
      result.current.mutate(enrollmentId)
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    expect(toast.error).toHaveBeenCalledWith('Error: unenroll failed')

    useStore.setState({ unenrollStudent: originalUnenrollStudent })
  })
})

describe('useSetGrade', () => {
  beforeEach(() => {
    queryClient = new QueryClient()
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
  })

  it('fires success toast on successful grade setting', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useSetGrade(), { wrapper: createWrapper() })

    const state = useStore.getState()
    const enrollment = state.enrollments[0]
    if (!enrollment) throw new Error('expected at least one enrollment')

    await act(async () => {
      result.current.mutate({
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        score: 95,
      })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('toasts.gradeSaved')
    })
  })

  it('invalidates the grades cache so the Course roster reflects the saved score', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSetGrade(), { wrapper: createWrapper() })

    const state = useStore.getState()
    const enrollment = state.enrollments[0]
    if (!enrollment) throw new Error('expected at least one enrollment')

    await act(async () => {
      result.current.mutate({
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        score: 88,
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['grades'] })
  })

  it('invalidates the certificates cache so a post-close reconciliation is not stale', async () => {
    // The in-course roster edits Grades through setGrade, which reconciles the
    // Certificate once the Course is closed (ADR-0025). Without ['certificates'] the
    // in-course Certificates section would read a revoked or stale credential.
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useSetGrade(), { wrapper: createWrapper() })

    const state = useStore.getState()
    const enrollment = state.enrollments[0]
    if (!enrollment) throw new Error('expected at least one enrollment')

    await act(async () => {
      result.current.mutate({
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        score: 88,
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['certificates'] })
  })

  it('fires error toast on grade setting failure', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useSetGrade(), { wrapper: createWrapper() })

    const originalSetGrade = useStore.getState().setGrade
    useStore.setState({
      setGrade: () => {
        throw new Error('grade setting failed')
      },
    })

    const state = useStore.getState()
    const enrollment = state.enrollments[0]
    if (!enrollment) throw new Error('expected at least one enrollment')

    await act(async () => {
      result.current.mutate({
        studentId: enrollment.studentId,
        courseId: enrollment.courseId,
        score: 95,
      })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    expect(toast.error).toHaveBeenCalledWith('Error: grade setting failed')

    useStore.setState({ setGrade: originalSetGrade })
  })
})
