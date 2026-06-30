import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'
import {
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useCurrentStudent,
} from '../students'
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

describe('useCreateStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  afterEach(() => {
    useStore.getState().resetDemo()
    vi.restoreAllMocks()
  })

  it('fires success toast on successful create', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useCreateStudent(), { wrapper: createWrapper() })

    const newStudent = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      gender: 'M' as const,
      sede: 'Linda Vista' as const,
      province: 'Province1',
      canton: 'Canton1',
      educationalLevel: 'primaria' as const,
      guardian: {
        name: 'Encargado Test',
        relationship: 'madre' as const,
        phone: '8888-8888',
        email: 'enc@example.com',
      },
    }

    result.current.mutate(newStudent)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith('toasts.studentCreated')
  })

  it('fires error toast on failed create', async () => {
    const { toast } = await import('sonner')

    // Force an error by spying on the store action
    const state = useStore.getState()
    vi.spyOn(state, 'createStudent').mockImplementation(() => {
      throw new Error('Database error')
    })

    const { result } = renderHook(() => useCreateStudent(), { wrapper: createWrapper() })

    const newStudent = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      gender: 'M' as const,
      sede: 'Linda Vista' as const,
      province: 'Province1',
      canton: 'Canton1',
      educationalLevel: 'primaria' as const,
      guardian: {
        name: 'Encargado Test',
        relationship: 'madre' as const,
        phone: '8888-8888',
        email: 'enc@example.com',
      },
    }

    result.current.mutate(newStudent)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('toasts.error: Database error')
  })
})

describe('useCurrentStudent (#166)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().resetDemo()
  })

  afterEach(() => {
    useStore.getState().resetDemo()
    vi.restoreAllMocks()
  })

  it('returns the logged-in Student through the self-scoped seam', async () => {
    useStore.getState().setRole('student')
    const { currentUserId } = useStore.getState()
    const { result } = renderHook(() => useCurrentStudent(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.id).toBe(currentUserId)
  })

  it('returns null for a non-Student role (no own student record)', async () => {
    useStore.getState().setRole('admin')
    const { result } = renderHook(() => useCurrentStudent(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })
})

describe('useUpdateStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  afterEach(() => {
    useStore.getState().resetDemo()
    vi.restoreAllMocks()
  })

  it('fires success toast on successful update', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useUpdateStudent(), { wrapper: createWrapper() })

    const students = useStore.getState().students
    const firstStudent = students[0]
    if (!firstStudent) throw new Error('No students in store')

    result.current.mutate({
      id: firstStudent.id,
      patch: { firstName: 'Jane' },
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith('toasts.studentUpdated')
  })

  it('fires error toast on failed update', async () => {
    const { toast } = await import('sonner')

    // Force an error by spying on the store action
    const state = useStore.getState()
    vi.spyOn(state, 'updateStudent').mockImplementation(() => {
      throw new Error('Update failed')
    })

    const { result } = renderHook(() => useUpdateStudent(), { wrapper: createWrapper() })

    const students = useStore.getState().students
    const firstStudent = students[0]
    if (!firstStudent) throw new Error('No students in store')

    result.current.mutate({
      id: firstStudent.id,
      patch: { firstName: 'Jane' },
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('toasts.error: Update failed')
  })
})

describe('useDeleteStudent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  afterEach(() => {
    useStore.getState().resetDemo()
    vi.restoreAllMocks()
  })

  it('fires success toast on successful delete', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useDeleteStudent(), { wrapper: createWrapper() })

    const students = useStore.getState().students
    const firstStudent = students[0]
    if (!firstStudent) throw new Error('No students in store')

    result.current.mutate(firstStudent.id)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(toast.success).toHaveBeenCalledWith('toasts.studentDeleted')
  })

  it('fires error toast on failed delete', async () => {
    const { toast } = await import('sonner')

    // Force an error by spying on the store action
    const state = useStore.getState()
    vi.spyOn(state, 'deleteStudent').mockImplementation(() => {
      throw new Error('Cannot delete student')
    })

    const { result } = renderHook(() => useDeleteStudent(), { wrapper: createWrapper() })

    const students = useStore.getState().students
    const firstStudent = students[0]
    if (!firstStudent) throw new Error('No students in store')

    result.current.mutate(firstStudent.id)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(toast.error).toHaveBeenCalledWith('toasts.error: Cannot delete student')
  })
})
