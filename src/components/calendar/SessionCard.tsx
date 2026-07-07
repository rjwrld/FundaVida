import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { shortCourseName } from '@/lib/courseName'
import type { Session } from '@/lib/sessions'
import type { AttendanceRecord, Course } from '@/types'

/**
 * A session card's status: an already-marked Student's own attendance status,
 * `'needsMarking'` for a past unmarked Session (teacher/admin worklist), or
 * `'none'` for an upcoming Session that carries no status yet.
 */
export type SessionCardStatus = AttendanceRecord['status'] | 'needsMarking' | 'none'

export interface SessionCardProps {
  course: Course
  session: Session
  status: SessionCardStatus
  /** Teacher/admin cards deep-link to Mark Attendance; student/tcu cards are read-only (ADR-0038). */
  linkToMark?: boolean
}

/**
 * The flat hairline card that fills each WeekCanvas day-column (and the mobile
 * agenda stack). Semantic-only color: a marked Student status maps to the
 * shared attendance Badge variants, "needs marking" is a mono chip (Figure-
 * Green is spent only on the Mark action and today, not on every card) —
 * there is deliberately no course-keyed accent (ADR-0038).
 */
export function SessionCard({ course, session, status, linkToMark = false }: SessionCardProps) {
  const { t } = useTranslation()

  const content = (
    <>
      <p className="truncate text-sm font-medium text-foreground">{shortCourseName(course)}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {course.sede} · {t('calendar.card.session')}{' '}
        <span className="font-mono tabular-nums">{session.ordinal}</span>
      </p>
      {status !== 'none' ? (
        <div className="mt-2">
          {status === 'needsMarking' ? (
            <Badge variant="neutral">{t('calendar.card.needsMarking')}</Badge>
          ) : (
            <Badge
              variant={
                status === 'present' ? 'success' : status === 'absent' ? 'destructive' : 'info'
              }
            >
              {t(`attendance.list.status.${status}`)}
            </Badge>
          )}
        </div>
      ) : null}
    </>
  )

  const className = 'block rounded-lg border border-border bg-card p-3 transition-colors'

  if (linkToMark) {
    return (
      <Link
        to={`/app/courses/${course.id}/sessions/${session.date}/mark`}
        className={`${className} hover:border-brand-green-400 hover:bg-brand-green-50 dark:hover:bg-brand-green-950/30`}
      >
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
