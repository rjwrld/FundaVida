import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/data/store'
import { courseQueryOptions } from './courses'
import { enrollmentsQueryOptions } from './enrollments'

/**
 * Warms the two queries that gate the Course detail page's first paint — the
 * Course itself and the Course-scoped Enrollments (its third gating query, the
 * browseable read, is conditionally disabled and so never holds the gate,
 * ADR-0030). Call it on hover/focus intent: a detail page that finds both in
 * cache paints its heading on the first commit, which is the only commit where
 * the card→detail morph can still pair with the list node it grew out of.
 *
 * A miss costs nothing — the page simply opens on its loading gate and navigates
 * plainly, exactly as it did before.
 */
export function usePrefetchCourseDetail() {
  const queryClient = useQueryClient()
  const role = useStore((s) => s.role)

  return useCallback(
    (courseId: string) => {
      if (!courseId) return
      void queryClient.prefetchQuery(courseQueryOptions(courseId, role))
      void queryClient.prefetchQuery(enrollmentsQueryOptions({ courseId }, role))
    },
    [queryClient, role]
  )
}
