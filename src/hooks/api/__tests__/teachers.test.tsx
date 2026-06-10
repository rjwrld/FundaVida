import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import { useCreateTeacher, useUpdateTeacher, useDeleteTeacher } from '../teachers'
import { useStore } from '@/data/store'

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'toasts.error' && options?.message) {
        return `toasts.error: ${options.message}`
      }
      return key
    },
  }),
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('useCreateTeacher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().resetDemo()
  })

  afterEach(() => {
    useStore.getState().resetDemo()
    // Restore original methods
    vi.restoreAllMocks()
  })

  it('fires success toast on successful create', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useCreateTeacher(), { wrapper: createWrapper() })

    const newTeacher = {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    }

    result.current.mutate(newTeacher)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith('toasts.teacherCreated')
  })

  it('fires error toast on failed create', async () => {
    const { toast } = await import('sonner')

    // Force an error by spying on the store action
    const state = useStore.getState()
    vi.spyOn(state, 'createTeacher').mockImplementation(() => {
      throw new Error('Database error')
    })

    const { result } = renderHook(() => useCreateTeacher(), { wrapper: createWrapper() })

    const newTeacher = {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    }

    result.current.mutate(newTeacher)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('toasts.error: Database error')
  })
})

describe('useUpdateTeacher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().resetDemo()
  })

  afterEach(() => {
    useStore.getState().resetDemo()
    vi.restoreAllMocks()
  })

  it('fires success toast on successful update', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useUpdateTeacher(), { wrapper: createWrapper() })

    const teachers = useStore.getState().teachers
    const firstTeacher = teachers[0]
    if (!firstTeacher) throw new Error('No teachers in store')

    result.current.mutate({
      id: firstTeacher.id,
      patch: { firstName: 'Bob' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith('toasts.teacherUpdated')
  })

  it('fires error toast on failed update', async () => {
    const { toast } = await import('sonner')

    // Force an error by spying on the store action
    const state = useStore.getState()
    vi.spyOn(state, 'updateTeacher').mockImplementation(() => {
      throw new Error('Update failed')
    })

    const { result } = renderHook(() => useUpdateTeacher(), { wrapper: createWrapper() })

    const teachers = useStore.getState().teachers
    const firstTeacher = teachers[0]
    if (!firstTeacher) throw new Error('No teachers in store')

    result.current.mutate({
      id: firstTeacher.id,
      patch: { firstName: 'Bob' },
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('toasts.error: Update failed')
  })
})

describe('useDeleteTeacher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().resetDemo()
  })

  afterEach(() => {
    useStore.getState().resetDemo()
    vi.restoreAllMocks()
  })

  it('fires success toast on successful delete', async () => {
    const { toast } = await import('sonner')

    // Find a teacher with no courses before rendering the hook
    let teacherId: string | null = null
    const teachers = useStore.getState().teachers
    for (const teacher of teachers) {
      if (teacher.courseIds.length === 0) {
        teacherId = teacher.id
        break
      }
    }

    if (!teacherId) {
      // If all teachers have courses, create a new one
      const newTeacher = useStore.getState().createTeacher({
        firstName: 'NoCoursesTeacher',
        lastName: 'Test',
        email: 'nocourses@example.com',
      })
      teacherId = newTeacher.id
    }

    const { result } = renderHook(() => useDeleteTeacher(), { wrapper: createWrapper() })

    result.current.mutate(teacherId)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith('toasts.teacherDeleted')
  })

  it('fires error toast when deleting teacher with assigned courses', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useDeleteTeacher(), { wrapper: createWrapper() })

    // Find a teacher with courses
    const teachers = useStore.getState().teachers
    const teacherWithCourses = teachers.find((t) => t.courseIds.length > 0)

    if (teacherWithCourses) {
      result.current.mutate(teacherWithCourses.id)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(toast.error).toHaveBeenCalled()
      const callArgs = (toast.error as unknown as { mock: { calls: unknown[][] } }).mock
        .calls[0]?.[0] as string | undefined
      expect(callArgs).toMatch(/toasts\.error.*reassign/)
    }
  })
})
