import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { MorphSpan } from '@/components/shared/MorphSpan'
import { usePrefetchCourseDetail } from '@/hooks/api/prefetch'
import { courseMorphLayoutId } from '@/lib/courseMorph'
import { shortCourseName } from '@/lib/courseName'
import { cn } from '@/lib/utils'
import type { Course } from '@/types'

export interface CourseTitleLinkProps {
  course: Course
  /**
   * Whether this instance owns the Course's shared element. Exactly one rendered
   * node per Course may — the DataTable renders each row twice and only one of the
   * two is visible, so the list passes `useDataTableSurface()`'s verdict down
   * rather than letting both copies register the same `layoutId`.
   */
  shared: boolean
  className?: string
}

/**
 * A Course's name, linking to its detail page and — where it owns the shared
 * element — morphing into that page's heading on the way there (ADR-0047 phase
 * 6c; the rule lives in `lib/courseMorph.ts`). Hover or focus warms the detail
 * page's cache, which is what lets the heading paint in the same commit this node
 * leaves in; without that warmth the navigation is simply plain, never broken.
 */
export function CourseTitleLink({ course, shared, className }: CourseTitleLinkProps) {
  const reduce = useReducedMotion()
  const prefetchDetail = usePrefetchCourseDetail()
  const layoutId = shared && !reduce ? courseMorphLayoutId(course.id) : undefined
  const name = shortCourseName(course)

  return (
    <Link
      to={`/app/courses/${course.id}`}
      className={cn('hover:underline', className)}
      onPointerEnter={() => prefetchDetail(course.id)}
      onFocus={() => prefetchDetail(course.id)}
    >
      {layoutId ? <MorphSpan layoutId={layoutId}>{name}</MorphSpan> : name}
    </Link>
  )
}
