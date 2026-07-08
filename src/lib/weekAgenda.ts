import { isSameDay, parseISO, startOfWeek } from 'date-fns'
import type { Course, SessionException } from '@/types'
import { effectiveSessions, type Session } from './sessions'

/** A {@link Session} enriched with its Course, for the week canvas's day columns. */
export interface WeekSession extends Session {
  course: Course
}

/** One Mon→Sun day-column of the week canvas. */
export interface WeekDay {
  date: Date
  sessions: WeekSession[]
}

/**
 * The Monday that starts the week containing `date` (Monday-start, matching
 * `CalendarWidget` and the domain's Mon..Sun `Weekday` ordering).
 */
export function startOfWeekMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/**
 * Every scoped Course's effective Sessions (ADR-0001 base + the ADR-0039
 * exceptions overlay), each tagged with its Course.
 */
function allWeekSessions(courses: Course[], exceptions: SessionException[]): WeekSession[] {
  return courses.flatMap((course) =>
    effectiveSessions(course, exceptions).map((session) => ({ ...session, course }))
  )
}

/**
 * The seven Mon→Sun day-columns for the week containing `date`: every scoped
 * Course's effective Sessions (ADR-0001 + the ADR-0039 overlay) bucketed by
 * calendar day. Empty days come back with an empty `sessions` array — the canvas
 * renders them quiet, never broken (ADR-0038).
 */
export function weekAgendaDays(
  courses: Course[],
  date: Date,
  exceptions: SessionException[] = []
): WeekDay[] {
  const weekStart = startOfWeekMonday(date)
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i),
    sessions: [],
  }))

  const allSessions = allWeekSessions(courses, exceptions)

  days.forEach((day) => {
    day.sessions = allSessions
      .filter((session) => isSameDay(parseISO(session.date), day.date))
      .sort((a, b) => a.ordinal - b.ordinal)
  })

  return days
}

/**
 * A single day's Sessions across scoped Courses, tagged with their Course and
 * sorted by ordinal — the month-mode day-detail panel's data (ADR-0038: "tap a
 * day → its cards"). Shares the same bucketing shape as {@link weekAgendaDays}
 * so a day never derives its Sessions two different ways.
 */
export function sessionsOnDay(
  courses: Course[],
  date: Date,
  exceptions: SessionException[] = []
): WeekSession[] {
  return allWeekSessions(courses, exceptions)
    .filter((session) => isSameDay(parseISO(session.date), date))
    .sort((a, b) => a.ordinal - b.ordinal)
}
