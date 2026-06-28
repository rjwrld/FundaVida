import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { parseISO, isBefore } from 'date-fns'
import { clock } from '@/lib/clock'
import { sessionsFor } from '@/lib/sessions'
import type { Course } from '@/types'

interface UpcomingSession {
  date: string
  ordinal: number
  courseId: string
  courseName: string
}

/**
 * Find all upcoming sessions across courses, sorted by date.
 */
function getUpcomingSessions(courses: Course[]): UpcomingSession[] {
  const now = clock.now()
  return courses
    .flatMap((c) =>
      sessionsFor(c).map((s) => ({
        date: s.date,
        ordinal: s.ordinal,
        courseId: c.id,
        courseName: c.name,
      }))
    )
    .filter((s) => isBefore(now, parseISO(s.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

export interface NextSessionsListProps {
  courses: Course[]
  limit?: number
}

/**
 * Renders a list of the teacher's upcoming sessions with links to mark attendance.
 * Replaces the binary 1/0 "next session" counter.
 */
export function NextSessionsList({ courses, limit = 5 }: NextSessionsListProps) {
  const { t } = useTranslation()
  const sessions = getUpcomingSessions(courses).slice(0, limit)

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-center gap-2">
        <Clock className="size-4 text-brand-green-700" aria-hidden="true" />
        <h3 className="font-display text-lg text-foreground">
          {t('dashboard.teacher.nextSessions')}
        </h3>
      </header>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.teacher.noUpcomingSessions')}</p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-border/60">
          {sessions.map((session) => (
            <li
              key={`${session.courseId}-${session.date}`}
              className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{session.courseName}</p>
                <p className="text-xs text-muted-foreground">
                  {t('calendar.sessionEntry', {
                    ordinal: String(session.ordinal),
                    course: session.courseName,
                  } as Record<string, string>)}
                </p>
              </div>
              <Link
                to={`/app/courses/${session.courseId}/sessions/${session.date}/mark`}
                className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t('dashboard.teacher.markAttendance')}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
