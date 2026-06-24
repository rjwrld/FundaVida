import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeEntityMutation } from '../makeEntityMutation'
import { useStore } from '@/data/store'
import {
  clearPersistedState,
  clearPersistedRole,
  clearPersistedCurrentUser,
} from '@/data/persistence'

// Mock sonner so we can assert which toast fired.
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock react-i18next so `t` echoes the key (and interpolates the error message).
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      key === 'toasts.error' && options?.message ? `toasts.error: ${options.message}` : key,
  }),
}))

const validStudent = {
  firstName: 'Test',
  lastName: 'Student',
  email: 'test@example.com',
  gender: 'M' as const,
  province: 'San José',
  canton: 'Central',
  educationalLevel: 'Secondary',
}

let queryClient: QueryClient

function wrapper() {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

describe('makeEntityMutation', () => {
  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
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
    vi.restoreAllMocks()
  })

  it('fires the configured success toast after the store method succeeds', async () => {
    const { toast } = await import('sonner')
    const useThing = makeEntityMutation('createStudent')({
      toastKey: 'toasts.studentCreated',
      invalidates: [['students']],
    })

    const { result } = renderHook(() => useThing(), { wrapper: wrapper() })
    result.current.mutate(validStudent)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(toast.success).toHaveBeenCalledWith('toasts.studentCreated')
  })

  it('fires the error toast when the store method throws', async () => {
    const { toast } = await import('sonner')
    vi.spyOn(useStore.getState(), 'createStudent').mockImplementation(() => {
      throw new Error('boom')
    })
    const useThing = makeEntityMutation('createStudent')({
      toastKey: 'toasts.studentCreated',
      invalidates: [['students']],
    })

    const { result } = renderHook(() => useThing(), { wrapper: wrapper() })
    result.current.mutate(validStudent)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(toast.error).toHaveBeenCalledWith('toasts.error: boom')
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('invalidates the configured entity keys plus the audit key on success', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const useThing = makeEntityMutation('createStudent')({
      toastKey: 'toasts.studentCreated',
      invalidates: [['students'], ['enrollments']],
    })

    const { result } = renderHook(() => useThing(), { wrapper: wrapper() })
    result.current.mutate(validStudent)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['students'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['enrollments'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auditLog'] })
  })

  it('does not invalidate anything when the store method throws', async () => {
    vi.spyOn(useStore.getState(), 'createStudent').mockImplementation(() => {
      throw new Error('boom')
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const useThing = makeEntityMutation('createStudent')({
      toastKey: 'toasts.studentCreated',
      invalidates: [['students']],
    })

    const { result } = renderHook(() => useThing(), { wrapper: wrapper() })
    result.current.mutate(validStudent)

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('maps variables to positional args and derives invalidation keys from them', async () => {
    const { toast } = await import('sonner')
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const useThing = makeEntityMutation('updateStudent')<{
      id: string
      patch: { firstName: string }
    }>({
      toastKey: 'toasts.studentUpdated',
      invalidates: ({ id }) => [['students'], ['students', id]],
      args: ({ id, patch }) => [id, patch],
    })

    const first = useStore.getState().students[0]
    if (!first) throw new Error('expected at least one seeded student')

    const { result } = renderHook(() => useThing(), { wrapper: wrapper() })
    result.current.mutate({ id: first.id, patch: { firstName: 'Jane' } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(toast.success).toHaveBeenCalledWith('toasts.studentUpdated')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['students', first.id] })
    expect(useStore.getState().students[0]?.firstName).toBe('Jane')
  })
})
