import { isBefore, parseISO } from 'date-fns'
import type { AttendanceRecord, Course, Enrollment, Grade } from '@/types'
import { type Session, isSessionMarked, isSessionRecordable, sessionsFor } from './sessions'

/**
 * True when the Course's Term has ended: term.end strictly before `now`. The one
 * term-end seam — {@link coursesToClose} (dashboard.ts) and `courseDisplayState`'s
 * `termEnded` branch (ADR-0042) both call this, so the "Term ended" badge, the
 * enrollment gate, and the close worklist can never disagree.
 */
export function isTermEnded(course: Course, now: Date): boolean {
  return isBefore(parseISO(course.term.end), now)
}

/** The three record lists may be unfiltered — each is filtered to `course.id` internally. */
export interface CloseReadinessInput {
  course: Course
  enrollments: Enrollment[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  /** The clock — callers pass it so this module stays pure. */
  now: Date
}

export interface CloseReadiness {
  /**
   * studentIds of approved enrollments in this Course with no Grade for this
   * Course. Any Grade counts as coverage — existence, not the passing
   * threshold; the passing filter happens at certificate emission (ADR-0024).
   * Deduplicated.
   */
  ungradedStudentIds: string[]
  /**
   * Past derived sessions (ADR-0001) with zero attendance records. A session
   * is recorded once ANY AttendanceRecord for this Course matches its date
   * same-day. Ascending order.
   */
  unrecordedSessions: Session[]
  /** true iff both lists are empty. */
  ready: boolean
}

/**
 * Derive whether a Course is ready to close (#204): every approved Student
 * graded and every past session's attendance recorded. Blockers are returned
 * as lists so the close flow can show the admin/Teacher exactly what's
 * missing.
 */
export function closeReadiness(input: CloseReadinessInput): CloseReadiness {
  const { course, enrollments, grades, attendance, now } = input

  const gradedStudentIds = new Set(
    grades.filter((g) => g.courseId === course.id).map((g) => g.studentId)
  )
  const approvedStudentIds = new Set(
    enrollments
      .filter((e) => e.courseId === course.id && e.status === 'approved')
      .map((e) => e.studentId)
  )
  const ungradedStudentIds = [...approvedStudentIds].filter((id) => !gradedStudentIds.has(id))

  const unrecordedSessions = sessionsFor(course).filter((session) => {
    // Only past/recordable sessions can be missing attendance — the one
    // session-window boundary (ADR-0034). `now` is compared at day granularity.
    if (!isSessionRecordable(session, now)) return false
    // Marked-vs-unmarked is the shared isSessionMarked rule (ADR-0038).
    return !isSessionMarked(course.id, session.date, attendance)
  })

  return {
    ungradedStudentIds,
    unrecordedSessions,
    ready: ungradedStudentIds.length === 0 && unrecordedSessions.length === 0,
  }
}
