import { eachDayOfInterval, getDay, isSameDay, parseISO, startOfDay } from 'date-fns'
import { type Course, WEEKDAYS, type Weekday } from '@/types/domain'

export interface Session {
  courseId: string
  date: string
  ordinal: number
}

/**
 * Derive all sessions for a course: every calendar day inside the term
 * whose weekday is in course.meetingDays, in ascending order.
 * Date is anchored at local midnight (ISO string).
 * Ordinal is 1-based position within the course's session list.
 *
 * Degenerate cases return empty list:
 * - empty meetingDays
 * - term.end before term.start
 */
export function sessionsFor(course: Course): Session[] {
  if (course.meetingDays.length === 0) {
    return []
  }

  const start = startOfDay(parseISO(course.term.start))
  const end = startOfDay(parseISO(course.term.end))

  // Malformed term strings (NaN dates) or an inverted term derive nothing —
  // eachDayOfInterval would throw on either.
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return []
  }

  // Map weekday literals to JS day numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
  const meetingDayNumbers = new Set(course.meetingDays.map((weekday) => weekdayToNumber(weekday)))

  const days = eachDayOfInterval({ start, end })
  const sessions: Session[] = []

  days.forEach((day) => {
    const dayNumber = getDay(day)
    if (meetingDayNumbers.has(dayNumber)) {
      sessions.push({
        courseId: course.id,
        date: day.toISOString(),
        ordinal: sessions.length + 1,
      })
    }
  })

  return sessions
}

/**
 * Find the session for a given date by same-day comparison.
 * Returns null if the date doesn't land on a meeting day or is outside the term.
 * Comparison uses date-fns isSameDay, which properly handles timezone-aware same-day binding.
 */
export function findSession(course: Course, date: string): Session | null {
  const sessions = sessionsFor(course)
  const targetDate = parseISO(date)

  for (const session of sessions) {
    const sessionDate = parseISO(session.date)
    if (isSameDay(targetDate, sessionDate)) {
      return session
    }
  }

  return null
}

/**
 * Convert weekday literal to JS day number.
 * mon=1, tue=2, ..., sun=0
 */
function weekdayToNumber(weekday: Weekday): number {
  const index = WEEKDAYS.indexOf(weekday)
  // WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  // JS days: 0=Sun, 1=Mon, ..., 6=Sat
  // So: mon (index 0) -> 1, tue (index 1) -> 2, ..., sun (index 6) -> 0
  return (index + 1) % 7
}
