import { isSameDay, parseISO, startOfDay, startOfWeek } from 'date-fns'
import type { Course, SessionException } from '@/types'
import { effectiveSessions, type Session } from './sessions'

/** A {@link Session} enriched with its Course, for the week canvas's day columns. */
export interface WeekSession extends Session {
  course: Course
  /** Total effective Sessions in the Course — the "n/total" denominator on the card. */
  total: number
}

/** One Mon→Sun day-column of the week canvas. */
export interface WeekDay {
  date: Date
  sessions: WeekSession[]
}

/** The nearest Session to a displayed week in one direction, for the empty-week jump. */
export interface NearestSession {
  courseId: string
  courseName: string
  date: string
}

/**
 * The Monday that starts the week containing `date` (Monday-start, matching
 * `MonthNavigator` and the domain's Mon..Sun `Weekday` ordering).
 */
export function startOfWeekMonday(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 })
}

/**
 * Every scoped Course's effective Sessions (ADR-0001 base + the ADR-0039
 * exceptions overlay), each tagged with its Course and the Course's total
 * Session count (the card's "n/total" denominator).
 */
function allWeekSessions(courses: Course[], exceptions: SessionException[]): WeekSession[] {
  return courses.flatMap((course) => {
    const sessions = effectiveSessions(course, exceptions)
    return sessions.map((session) => ({ ...session, course, total: sessions.length }))
  })
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
 * The columns the workweek canvas actually renders (ADR-0044): Monday–Friday
 * always, plus a Saturday or Sunday column *only* when it carries a Session
 * (users can author weekend meeting days; the seed never does). Takes the full
 * seven-day bucketing from {@link weekAgendaDays} so a day never derives its
 * Sessions two different ways.
 */
export function visibleWorkweekDays(days: WeekDay[]): WeekDay[] {
  return days.filter((day, index) => index < 5 || day.sessions.length > 0)
}

/**
 * The nearest Session before and after the displayed week, across the scoped
 * Courses — the data behind the empty-week "jump to that week" affordance
 * (ADR-0044). `prev` is the latest Session strictly before `weekStart`; `next`
 * is the earliest strictly after `weekEnd`. Either side is `null` when the term
 * boundary leaves nothing in that direction, so the empty state never dead-ends
 * against a fabricated date.
 */
export function nearestSessionsAround(
  courses: Course[],
  weekStart: Date,
  weekEnd: Date,
  exceptions: SessionException[] = []
): { prev: NearestSession | null; next: NearestSession | null } {
  const start = startOfDay(weekStart).getTime()
  const end = startOfDay(weekEnd).getTime()

  const all = courses.flatMap((course) =>
    effectiveSessions(course, exceptions).map((session) => ({
      courseId: course.id,
      courseName: course.name,
      date: session.date,
      time: startOfDay(parseISO(session.date)).getTime(),
    }))
  )

  let prev: (NearestSession & { time: number }) | null = null
  let next: (NearestSession & { time: number }) | null = null
  for (const s of all) {
    if (s.time < start && (!prev || s.time > prev.time)) prev = s
    if (s.time > end && (!next || s.time < next.time)) next = s
  }

  const strip = (s: (NearestSession & { time: number }) | null): NearestSession | null =>
    s ? { courseId: s.courseId, courseName: s.courseName, date: s.date } : null

  return { prev: strip(prev), next: strip(next) }
}
