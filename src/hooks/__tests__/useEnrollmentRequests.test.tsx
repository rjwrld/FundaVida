import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import { useEnrollmentRequestColumns, useEnrollmentRows } from '@/hooks/useEnrollmentRequests'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return (
    <I18nProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </I18nProvider>
  )
}

describe('useEnrollmentRows', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
    useStore.getState().setRole('admin')
  })

  // The join sorts ~1k enrollments; a re-render with the same reads must hand
  // back the same array, so a caller's own memo over it can hit.
  it('returns the same rows across a re-render with unchanged reads', async () => {
    const { result, rerender } = renderHook(() => useEnrollmentRows(), { wrapper })
    await waitFor(() => expect(result.current).not.toBeNull())
    const first = result.current

    rerender()

    expect(result.current).toBe(first)
  })
})

describe('useEnrollmentRequestColumns', () => {
  beforeEach(() => {
    useStore.getState().setLocale('en')
  })

  it('opens with Student · Course · Requested', () => {
    const { result } = renderHook(() => useEnrollmentRequestColumns(), { wrapper })
    expect(result.current.map((c) => c.id)).toEqual(['student', 'course', 'requested'])
  })

  it('places Campus after Course when asked', () => {
    const { result } = renderHook(() => useEnrollmentRequestColumns({ includeSede: true }), {
      wrapper,
    })
    expect(result.current.map((c) => c.id)).toEqual(['student', 'course', 'sede', 'requested'])
  })
})
