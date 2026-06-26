import { useTranslation } from 'react-i18next'
import { useDaySessions } from '@/hooks/useDaySessions'
import { CalendarWidget } from './CalendarWidget'
import { SessionList } from './SessionList'
import type { Course } from '@/types'

export interface DashboardCalendarProps {
  /** Courses already scoped to the viewer; their derived Sessions drive the calendar. */
  courses: Course[]
  /** Teacher/admin entries link into attendance; a Student's are read-only (ADR-0012/0013). */
  linkSessions: boolean
}

/**
 * A compact, vertical role-scoped calendar for the dashboard sidebar: the
 * CalendarWidget above its selected-day Session list. Reuses the same session
 * derivation (useDaySessions) and entry rendering (SessionList) as the full-page
 * RoleCalendar (ADR-0013) — only the layout differs (vertical vs side-by-side).
 */
export function DashboardCalendar({ courses, linkSessions }: DashboardCalendarProps) {
  const { t } = useTranslation()
  const { selected, setSelected, events, daySessions } = useDaySessions(courses)

  return (
    <div className="flex flex-col gap-4">
      <CalendarWidget selected={selected} events={events} onSelect={setSelected} />
      <section aria-label={t('calendar.panelTitle')}>
        <h3 className="font-display text-base text-foreground">{t('calendar.panelTitle')}</h3>
        <SessionList sessions={daySessions} linkSessions={linkSessions} />
      </section>
    </div>
  )
}
