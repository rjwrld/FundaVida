import { useTranslation } from 'react-i18next'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { clock } from '@/lib/clock'
import { courseDisplayState, type CourseDisplayState } from '@/lib/courseDisplayState'
import type { Course } from '@/types'

// One color language for the derived display state (ADR-0042), so the badge can
// never drift per page. Draft/Finished read as quiet (authoring / done); the
// live states carry meaning — In progress is the "good/active" success tint,
// Term ended is the muted attention cue that mirrors the close worklist.
const VARIANT_BY_STATE: Record<CourseDisplayState, BadgeProps['variant']> = {
  draft: 'outline',
  startsSoon: 'neutral',
  inProgress: 'success',
  termEnded: 'warning',
  finished: 'secondary',
}

interface CourseStateBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  course: Course
  /** Defaults to the clock seam (ADR-0014); overridable for tests. */
  now?: Date
}

/**
 * The single badge for a Course's derived display state (ADR-0042). Every status
 * badge across the app renders through this so copy and color stay in one place.
 * The label key is resolved dynamically — its manifest lines live in keys.ts.
 */
export function CourseStateBadge({ course, now, ...props }: CourseStateBadgeProps) {
  const { t } = useTranslation()
  const state = courseDisplayState(course, now ?? clock.now())
  return (
    <Badge variant={VARIANT_BY_STATE[state]} {...props}>
      {t(`courses.displayState.${state}`)}
    </Badge>
  )
}
