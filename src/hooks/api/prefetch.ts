import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/data/store'
import { coursesDetailRoute } from '@/pages/coursesDetailRoute'
import { courseQueryOptions } from './courses'
import { enrollmentsQueryOptions } from './enrollments'

/**
 * Warms the two queries that gate the Course detail page's first paint — the
 * Course itself and the Course-scoped Enrollments (its third gating query, the
 * browseable read, is conditionally disabled and so never holds the gate,
 * ADR-0030). Call it on hover/focus intent: a detail page that finds both in cache
 * paints its heading on the first commit, which is the only mount the card→detail
 * morph is armed for — without this warmth that path would be a rarity, since the
 * list's own query answers under a different key than the detail's.
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
      // The route's code is warmed on the same intent as its data: a lazy route costs
      // one suspended commit on its first render, and that commit lands late enough
      // to cost the morph its source box (see `lib/preloadableRoute.tsx`).
      coursesDetailRoute.preload()
      void queryClient.prefetchQuery(courseQueryOptions(courseId, role))
      void queryClient.prefetchQuery(enrollmentsQueryOptions({ courseId }, role))
    },
    [queryClient, role]
  )
}
