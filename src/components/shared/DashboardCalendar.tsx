import { useDaySessions } from '@/hooks/useDaySessions'
import { CalendarWidget } from './CalendarWidget'
import type { Course } from '@/types'

export interface DashboardCalendarProps {
  /** Courses already scoped to the viewer; their derived Sessions mark the calendar (ADR-0013). */
  courses: Course[]
}

/**
 * A compact role-scoped calendar for the dashboard sidebar: the CalendarWidget with
 * the viewer's Session days marked, as an at-a-glance month view. The full
 * session-by-day list lives on the dedicated /calendar page (RoleCalendar), so the
 * sidebar stays uncluttered.
 */
export function DashboardCalendar({ courses }: DashboardCalendarProps) {
  const { selected, setSelected, events } = useDaySessions(courses)

  return <CalendarWidget selected={selected} events={events} onSelect={setSelected} />
}
