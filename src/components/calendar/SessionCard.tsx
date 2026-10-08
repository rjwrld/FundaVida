import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { calendarCardName } from '@/lib/courseName'
import { cn } from '@/lib/utils'
import { useFormat } from '@/hooks/useFormat'
import type { Session } from '@/lib/sessions'
import type { AttendanceRecord, Course } from '@/types'

/**
 * A session card's status: an already-marked Student's own attendance status,
 * `'needsMarking'` for a past unmarked Session (teacher/admin worklist), or
 * `'none'` for a Session that carries no status yet.
 */
export type SessionCardStatus = AttendanceRecord['status'] | 'needsMarking' | 'none'

/** Time depth relative to today (ADR-0044): past mutes, today emphasizes, future sits quiet. */
export type SessionCardTime = 'past' | 'today' | 'future'

export interface SessionCardProps {
  course: Course
  session: Session
  status: SessionCardStatus
  /** Total effective Sessions in the Course — the "n/total" meta denominator. Omit to show just `n`. */
  total?: number
  /** Teacher/admin cards deep-link to Mark Attendance; student/tcu cards are read-only (ADR-0044). */
  linkToMark?: boolean
  /** Where the Session sits relative to today. Defaults to `'future'`. */
  time?: SessionCardTime
}

// The student's own verdict becomes a 3px edge rail + one word in the verdict
// hue — the Badge is gone from cards (ADR-0044). Green stays scarce: it is spent
// on present + the Mark action + today, nowhere else. `excused` reads as the
// neutral "late/other" state, so it takes a quiet muted rail, not a third color.
const VERDICT_RAIL: Record<AttendanceRecord['status'], string> = {
  present: 'border-l-success',
  absent: 'border-l-destructive',
  excused: 'border-l-muted-foreground',
}
const VERDICT_TEXT: Record<AttendanceRecord['status'], string> = {
  present: 'text-success-text',
  absent: 'text-destructive-text',
  excused: 'text-muted-foreground',
}

/**
 * The flat hairline card that fills each WeekCanvas day-column (and the mobile
 * agenda stack). A two-line clamped, de-suffixed title (the full canonical name
 * lives in the accessible name + tooltip) over a `{Sede} · Session n/total` meta
 * line. Semantic-only color, spent scarcely (ADR-0044/#239): a marked Student
 * verdict is a rail + word, a "needs marking" Session is the page's one
 * Figure-Green action, and time gets depth — past muted, today emphasized,
 * future default — with no per-course accent.
 */
export function SessionCard({
  course,
  session,
  status,
  total,
  linkToMark = false,
  time = 'future',
}: SessionCardProps) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()

  const verdict =
    status === 'present' || status === 'absent' || status === 'excused' ? status : null
  const showAction = status === 'needsMarking' && linkToMark

  const content = (
    <>
      <p
        className={cn(
          // Day columns can be narrow: break long Spanish words (with a hyphen
          // where the language allows) instead of clipping them mid-glyph.
          'line-clamp-2 text-sm font-medium hyphens-auto wrap-break-word',
          time === 'past' ? 'text-muted-foreground' : 'text-foreground'
        )}
      >
        {calendarCardName(course)}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {course.sede} · {t('calendar.card.session')}{' '}
        <span className="font-mono tabular-nums">
          {session.ordinal}
          {total != null ? `/${total}` : null}
        </span>
      </p>
      {verdict ? (
        <p className={cn('mt-1.5 text-xs font-semibold', VERDICT_TEXT[verdict])}>
          {t(`attendance.list.status.${verdict}`)}
        </p>
      ) : null}
      {showAction ? (
        // Inline text (not a flex row) so the arrow wraps with the last word
        // rather than poking out of a narrow card.
        <span className="mt-2 block text-xs font-semibold text-primary">
          {t('calendar.card.markAttendance')}
          <ArrowRight className="ml-1 inline size-3 align-[-0.125em]" aria-hidden="true" />
        </span>
      ) : null}
    </>
  )

  const className = cn(
    'block rounded-lg border border-border bg-card p-3 transition-colors',
    verdict && `border-l-[3px] ${VERDICT_RAIL[verdict]}`,
    time === 'today' && 'ring-1 ring-inset ring-primary/30',
    // Past depth comes from the muted title and a muted wash — never opacity,
    // which dragged the meta line below AA (3.2:1).
    time === 'past' && !verdict && 'bg-muted/40'
  )

  // The card title is clamped and de-suffixed, so the full canonical name is
  // recovered on hover. The Link's accessible name carries it too, with the
  // date and ordinal so a Course's cards on different days stay distinct; the
  // read-only card is not focusable, so the tooltip is a pointer affordance
  // only — exactly the reach the `title=""` it replaces had.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {linkToMark ? (
          <Link
            to={`/app/courses/${course.id}/sessions/${session.date}/mark`}
            aria-label={t('calendar.card.markAria', {
              course: course.name,
              date: formatDate(session.date),
              n: String(session.ordinal),
            })}
            className={cn(className, 'hover:border-primary hover:bg-accent')}
          >
            {content}
          </Link>
        ) : (
          <div className={className}>{content}</div>
        )}
      </TooltipTrigger>
      <TooltipContent>{course.name}</TooltipContent>
    </Tooltip>
  )
}
