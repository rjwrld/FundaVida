import { useQuery } from '@tanstack/react-query'
import type { SessionExceptionType } from '@/types'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { SessionExceptionFilters } from '@/data/api/sessionExceptions'
import { makeEntityMutation } from './makeEntityMutation'
import { SESSION_EXCEPTIONS_KEY } from './queryKeys'

/**
 * Read a Course's Session exceptions through the scope seam (ADR-0039): the
 * overlay `effectiveSessions` composes over the base derivation. Role/userId are
 * in the key so cache entries per viewer stay isolated, mirroring the other
 * scoped read hooks.
 */
export function useSessionExceptions(filters: SessionExceptionFilters = {}) {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...SESSION_EXCEPTIONS_KEY, role, userId, filters],
    queryFn: () => api.sessionExceptions.list(filters),
  })
}

export const useCreateSessionException = makeEntityMutation('createSessionException')<{
  courseId: string
  type: SessionExceptionType
  date: string
  newDate?: string
  note?: string
}>({
  toastKey: 'toasts.sessionExceptionCreated',
  args: (input) => [input],
})
