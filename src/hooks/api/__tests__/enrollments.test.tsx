import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useDeleteEnrollment } from '../enrollments'
import { useStore } from '@/data/store'
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

describe('useDeleteEnrollment', () => {
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

  it('fires success toast on successful enrollment deletion', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useDeleteEnrollment(), { wrapper: createWrapper() })

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

  it('fires error toast on enrollment deletion failure', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useDeleteEnrollment(), { wrapper: createWrapper() })

    const originalUnenrollStudent = useStore.getState().unenrollStudent
    useStore.setState({
      unenrollStudent: () => {
        throw new Error('delete enrollment failed')
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

    expect(toast.error).toHaveBeenCalledWith('Error: delete enrollment failed')

    useStore.setState({ unenrollStudent: originalUnenrollStudent })
  })
})
