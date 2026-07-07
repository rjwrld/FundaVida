import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import { PROGRAMS_KEY } from './queryKeys'

const programKey = (id: string) => [...PROGRAMS_KEY, id] as const

// Role is captured in the queryKey so cache entries per role are isolated, the
// same pattern as useCourses. Programs are org-wide ('all' for every role), so
// the result does not actually vary by role — but keying on it keeps the cache
// shape consistent across the app's read hooks.
export function usePrograms() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...PROGRAMS_KEY, role],
    queryFn: () => api.programs.list(),
  })
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: programKey(id),
    queryFn: () => api.programs.get(id),
    enabled: id.length > 0,
  })
}
