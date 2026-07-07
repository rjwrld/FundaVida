import { isSameDay, parseISO, startOfWeek } from 'date-fns'
import type { Course } from '@/types'
import { sessionsFor, type Session } from './sessions'

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
 * The seven Mon→Sun day-columns for the week containing `date`: every scoped
 * Course's derived Sessions (ADR-0001) bucketed by calendar day. Empty days
 * come back with an empty `sessions` array — the canvas renders them quiet,
 * never broken (ADR-0038).
 */
export function weekAgendaDays(courses: Course[], date: Date): WeekDay[] {
  const weekStart = startOfWeekMonday(date)
  const days: WeekDay[] = Array.from({ length: 7 }, (_, i) => ({
    date: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i),
    sessions: [],
  }))

  const allSessions: WeekSession[] = courses.flatMap((course) =>
    sessionsFor(course).map((session) => ({ ...session, course }))
  )

  days.forEach((day) => {
    day.sessions = allSessions
      .filter((session) => isSameDay(parseISO(session.date), day.date))
      .sort((a, b) => a.ordinal - b.ordinal)
  })

  return days
}
