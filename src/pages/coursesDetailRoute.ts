import { preloadableRoute } from '@/lib/preloadableRoute'

/**
 * The Course detail route, split out of `App.tsx`'s lazy block because two modules
 * need it: the router renders it, and `usePrefetchCourseDetail` preloads it on the
 * same hover that warms its queries. Its own import stays dynamic, so the page keeps
 * its chunk and this module stays a leaf — no cycle back through the page's hooks.
 */
export const coursesDetailRoute = preloadableRoute(() =>
  import('@/pages/CoursesDetailPage').then((m) => ({ default: m.CoursesDetailPage }))
)
