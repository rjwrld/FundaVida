import { useRef } from 'react'
import { useReducedMotion } from 'framer-motion'
import { courseMorphLayoutId } from '@/lib/courseMorph'

/**
 * The `layoutId` the Course detail heading should carry, or `undefined` for a
 * plain heading. Arms the morph only for a mount that paints the heading on its
 * first commit — `isPending` already `false` on the first render, meaning React
 * Query served every gating query from cache (ADR-0030). A mount that opened on
 * the loading gate stays disarmed for good: arming it once its queries land would
 * fire the morph after the route transition had already settled, popping the
 * heading back to a stale list position to fly up from. See
 * {@link courseMorphLayoutId} for the full rule.
 *
 * The verdict is re-taken per Course id, not per mount: the detail route stays
 * mounted across a `:id` swap, and the incoming Course deserves its own reading.
 */
export function useCourseMorphTarget(
  courseId: string | undefined,
  isPending: boolean
): string | undefined {
  const reduce = useReducedMotion()
  // Deriving from props during render, which is exactly what a ref is for here:
  // the verdict must be taken on the *first* render for this id, and the value a
  // later render would compute (`!isPending`, now true) is the wrong one.
  const firstPaint = useRef<{ courseId: string | undefined; warm: boolean } | null>(null)
  if (!firstPaint.current || firstPaint.current.courseId !== courseId) {
    firstPaint.current = { courseId, warm: !isPending }
  }

  if (reduce || !courseId || !firstPaint.current.warm) return undefined
  return courseMorphLayoutId(courseId)
}
