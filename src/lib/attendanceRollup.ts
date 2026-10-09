import type { AttendanceRecord, Course, SessionException } from '@/types'
import { needsMarking } from './agenda'
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
  /**
   * The share of `unmarked` that is work now: an in-progress cohort's, counted
   * by the calendar pulse's own {@link needsMarking}. A Term-ended cohort's gaps
   * are close-readiness's business (ADR-0044) and a closed one's are final.
   */
  needsMarking: number
}

export interface AttendanceRollupInput {
  courses: Course[]
  attendance: AttendanceRecord[]
  sessionExceptions?: SessionException[]
  now: Date
}

/**
 * The per-Course attendance rollup (ADR-0051): one row per scoped, non-draft
 * Course that has held a Session, worst first — the most Sessions needing
 * marking, then the lowest attendance rate (no records at all reads as lowest).
 * Its needs-marking total is the calendar admin pulse's number, by construction.
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

  const markingByCourse = new Map<string, number>()
  for (const session of needsMarking(courses, attendance, now, sessionExceptions)) {
    markingByCourse.set(session.courseId, (markingByCourse.get(session.courseId) ?? 0) + 1)
  }

  const rows: AttendanceRollupRow[] = []
  for (const course of courses) {
    // A draft is not a cohort yet: nothing it holds is attendance to roll up.
    if (course.status === 'draft') continue
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
      needsMarking: markingByCourse.get(course.id) ?? 0,
    })
  }

  return rows.sort(
    (a, b) =>
      b.needsMarking - a.needsMarking ||
      (a.rate ?? -1) - (b.rate ?? -1) ||
      a.course.name.localeCompare(b.course.name)
  )
}
