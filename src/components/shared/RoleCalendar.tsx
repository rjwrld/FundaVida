import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isSameDay } from 'date-fns'
import { Link } from 'react-router-dom'
import { sessionsFor, type Session } from '@/lib/sessions'
import { CalendarWidget } from './CalendarWidget'
import type { Course } from '@/types'

export interface RoleCalendarProps {
  /** Courses already scoped to the viewer; their derived Sessions drive the calendar. */
  courses: Course[]
  /** When true, each Session entry links into its Course's attendance (Teacher/admin); otherwise read-only. */
  linkSessions: boolean
}

interface DaySession extends Session {
  courseName: string
}

/**
 * A role-scoped calendar over derived Sessions (ADR-0013). The caller passes the
 * viewer's already-scoped Courses; this component derives their Sessions, marks
 * event days, and lists a clicked day's Sessions as Course name + ordinal.
 */
export function RoleCalendar({ courses, linkSessions }: RoleCalendarProps) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<Date>(() => new Date())

  const sessions = useMemo<DaySession[]>(
    () => courses.flatMap((c) => sessionsFor(c).map((s) => ({ ...s, courseName: c.name }))),
    [courses]
  )

  const events = useMemo(() => sessions.map((s) => new Date(s.date)), [sessions])

  const daySessions = useMemo(
    () => sessions.filter((s) => isSameDay(new Date(s.date), selected)),
    [sessions, selected]
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <CalendarWidget selected={selected} events={events} onSelect={setSelected} />
      <section
        aria-label={t('calendar.panelTitle')}
        className="rounded-xl border border-border bg-card p-5 shadow-card"
      >
        <h3 className="font-display text-base text-foreground">{t('calendar.panelTitle')}</h3>
        {daySessions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t('calendar.emptyDay')}</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {daySessions.map((s) => {
              const label = t('calendar.sessionEntry', {
                course: s.courseName,
                ordinal: String(s.ordinal),
              } as Record<string, string>)
              return (
                <li key={`${s.courseId}-${s.date}`} className="text-sm">
                  {linkSessions ? (
                    <Link
                      to={`/app/attendance?courseId=${s.courseId}`}
                      className="text-foreground hover:text-brand-green-700 hover:underline"
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className="text-foreground">{label}</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
