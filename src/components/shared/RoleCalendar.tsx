import { useTranslation } from 'react-i18next'
import { useDaySessions } from '@/hooks/useDaySessions'
import { CalendarWidget } from './CalendarWidget'
import { SessionList } from './SessionList'
import type { Course } from '@/types'

export interface RoleCalendarProps {
  /** Courses already scoped to the viewer; their derived Sessions drive the calendar. */
  courses: Course[]
  /** When true, each Session entry links into its Course's attendance (Teacher/admin); otherwise read-only. */
  linkSessions: boolean
}

/**
 * A role-scoped calendar over derived Sessions (ADR-0013). The caller passes the
 * viewer's already-scoped Courses; this lays the CalendarWidget side-by-side with
 * the selected day's Session list for the full-page /calendar route. The sidebar
 * variant is DashboardCalendar — both share useDaySessions + SessionList.
 */
export function RoleCalendar({ courses, linkSessions }: RoleCalendarProps) {
  const { t } = useTranslation()
  const { selected, setSelected, events, daySessions } = useDaySessions(courses)

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      <CalendarWidget selected={selected} events={events} onSelect={setSelected} />
      <section
        aria-label={t('calendar.panelTitle')}
        className="rounded-xl border border-border bg-card p-5"
      >
        <h3 className="font-display text-base text-foreground">{t('calendar.panelTitle')}</h3>
        <SessionList sessions={daySessions} linkSessions={linkSessions} />
      </section>
    </div>
  )
}
