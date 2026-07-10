import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { calendarCardName } from '@/lib/courseName'
import { cn } from '@/lib/utils'
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
  present: 'text-[oklch(0.5_0.16_138)] dark:text-[oklch(0.78_0.14_138)]',
  absent: 'text-[oklch(0.55_0.2_25)] dark:text-[oklch(0.72_0.17_22)]',
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

  const verdict =
    status === 'present' || status === 'absent' || status === 'excused' ? status : null
  const showAction = status === 'needsMarking' && linkToMark

  const content = (
    <>
      <p
        className={cn(
          'line-clamp-2 text-sm font-medium',
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
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-green-700 dark:text-brand-green-300">
          {t('calendar.card.markAttendance')}
          <ArrowRight className="size-3" aria-hidden="true" />
        </span>
      ) : null}
    </>
  )

  const className = cn(
    'block rounded-lg border border-border bg-card p-3 transition-colors',
    verdict && `border-l-[3px] ${VERDICT_RAIL[verdict]}`,
    time === 'today' && 'ring-1 ring-inset ring-brand-green-200 dark:ring-brand-green-900',
    time === 'past' && !verdict && 'opacity-80'
  )

  // The card title is clamped and de-suffixed, so the full canonical name is
  // recovered on hover. The Link also carries it as its accessible name; the
  // read-only card is not focusable, so the tooltip is a pointer affordance
  // only — exactly the reach the `title=""` it replaces had.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {linkToMark ? (
          <Link
            to={`/app/courses/${course.id}/sessions/${session.date}/mark`}
            aria-label={course.name}
            className={cn(
              className,
              'hover:border-brand-green-400 hover:bg-brand-green-50 dark:hover:bg-brand-green-950/30'
            )}
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
