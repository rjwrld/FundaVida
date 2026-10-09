import type { AttendanceRecord, Course, SessionException } from '@/types'
import { isLiveCohort } from './courseDisplayState'
import { effectiveSessions, isSessionMarked, isSessionRecordable } from './sessions'

/** One Course's attendance at a glance — a row of the admin's Attendance page. */
export interface AttendanceRollupRow {
  course: Course
  /** Sessions that have taken place (recordable, ADR-0034), exceptions applied. */
  sessionsHeld: number
  /** present / all records for the Course; null before anything is recorded. */
  rate: number | null
  /** Held Sessions with no attendance recorded at all (the shared marked rule). */
  unmarked: number
  /** Whether the gaps can still be filled — a closed cohort's are final (ADR-0024). */
  live: boolean
}

export interface AttendanceRollupInput {
  courses: Course[]
  attendance: AttendanceRecord[]
  sessionExceptions?: SessionException[]
  now: Date
}

/**
 * The per-Course attendance rollup (ADR-0051): one row per scoped Course that
 * has held a Session, worst first — the live cohorts with the most unmarked
 * Sessions, then the lowest attendance rate (no records at all reads as lowest).
 * Pure over already-scoped lists (ADR-0008); Sessions derive (ADR-0001) through
 * the exceptions overlay (ADR-0039) and "marked" is {@link isSessionMarked}, the
 * same rule close-readiness and the calendar use (ADR-0034/0038).
 */
export function attendanceRollup({
  courses,
  attendance,
  sessionExceptions = [],
  now,
}: AttendanceRollupInput): AttendanceRollupRow[] {
  const recordsByCourse = new Map<string, AttendanceRecord[]>()
  for (const record of attendance) {
    const list = recordsByCourse.get(record.courseId) ?? []
    list.push(record)
    recordsByCourse.set(record.courseId, list)
  }

  const rows: AttendanceRollupRow[] = []
  for (const course of courses) {
    const exceptions = sessionExceptions.filter((e) => e.courseId === course.id)
    const held = effectiveSessions(course, exceptions).filter((s) => isSessionRecordable(s, now))
    if (held.length === 0) continue
    const records = recordsByCourse.get(course.id) ?? []
    const present = records.filter((r) => r.status === 'present').length
    rows.push({
      course,
      sessionsHeld: held.length,
      rate: records.length > 0 ? present / records.length : null,
      unmarked: held.filter((s) => !isSessionMarked(course.id, s.date, records)).length,
      live: isLiveCohort(course),
    })
  }

  const workLeft = (row: AttendanceRollupRow) => (row.live ? row.unmarked : 0)
  return rows.sort(
    (a, b) =>
      workLeft(b) - workLeft(a) ||
      (a.rate ?? -1) - (b.rate ?? -1) ||
      a.course.name.localeCompare(b.course.name)
  )
}
