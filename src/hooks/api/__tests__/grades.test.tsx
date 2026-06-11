import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, act, waitFor } from '@testing-library/react'
import { ReactNode } from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useUpdateGradeScore } from '../grades'
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

describe('useUpdateGradeScore', () => {
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

  it('fires success toast on successful grade score update', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useUpdateGradeScore(), { wrapper: createWrapper() })

    const grade = useStore.getState().grades[0]
    if (!grade) throw new Error('expected at least one grade')
    const gradeId = grade.id

    await act(async () => {
      result.current.mutate({ id: gradeId, score: 88 })
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('toasts.gradeSaved')
    })
  })

  it('fires error toast on grade score update failure', async () => {
    const { toast } = await import('sonner')
    const { result } = renderHook(() => useUpdateGradeScore(), { wrapper: createWrapper() })

    const originalUpdateGradeScore = useStore.getState().updateGradeScore
    useStore.setState({
      updateGradeScore: () => {
        throw new Error('update score failed')
      },
    })

    const grade = useStore.getState().grades[0]
    if (!grade) throw new Error('expected at least one grade')
    const gradeId = grade.id

    await act(async () => {
      result.current.mutate({ id: gradeId, score: 88 })
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    })

    expect(toast.error).toHaveBeenCalledWith('Error: update score failed')

    useStore.setState({ updateGradeScore: originalUpdateGradeScore })
  })
})

// Note: useDeleteGrade tests are skipped because admin cannot delete grades per the permissions matrix.
// Grades are not meant to be deleted once issued; see the permissions module.
// describe('useDeleteGrade', () => {
//   beforeEach(() => {
//     queryClient = new QueryClient()
//     clearPersistedState()
//     clearPersistedRole()
//     clearPersistedCurrentUser()
//     useStore.getState().resetDemo()
//     useStore.getState().setRole('admin')
//     vi.clearAllMocks()
//   })
//
//   afterEach(() => {
//     clearPersistedState()
//     clearPersistedRole()
//     clearPersistedCurrentUser()
//   })
//
//   it('fires success toast on successful grade deletion', async () => {
//     const { toast } = await import('sonner')
//     const { result } = renderHook(() => useDeleteGrade(), { wrapper: createWrapper() })
//
//     const grade = useStore.getState().grades[0]
//     if (!grade) throw new Error('expected at least one grade')
//     const gradeId = grade.id
//
//     await act(async () => {
//       result.current.mutate(gradeId)
//     })
//
//     await waitFor(() => {
//       expect(toast.success).toHaveBeenCalledWith('toasts.gradeDeleted')
//     })
//   })
//
//   it('fires error toast on grade deletion failure', async () => {
//     const { toast } = await import('sonner')
//     const { result } = renderHook(() => useDeleteGrade(), { wrapper: createWrapper() })
//
//     const originalDeleteGrade = useStore.getState().deleteGrade
//     useStore.setState({
//       deleteGrade: () => {
//         throw new Error('delete grade failed')
//       },
//     })
//
//     const grade = useStore.getState().grades[0]
//     if (!grade) throw new Error('expected at least one grade')
//     const gradeId = grade.id
//
//     await act(async () => {
//       result.current.mutate(gradeId)
//     })
//
//     await waitFor(() => {
//       expect(toast.error).toHaveBeenCalled()
//     })
//
//     expect(toast.error).toHaveBeenCalledWith('Error: delete grade failed')
//
//     useStore.setState({ deleteGrade: originalDeleteGrade })
//   })
// })
