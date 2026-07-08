import type {
  AttendanceRecord,
  Certificate,
  Course,
  Enrollment,
  Grade,
  Role,
  SessionException,
} from '@/types'
import { parseISO } from 'date-fns'
import { courseDisplayState } from './courseDisplayState'
import { MIN_ATTENDANCE_RATE, coursesToClose } from './dashboard'
import { buildStudentProgress } from './studentProgress'
import {
  type Session,
  type UpcomingSession,
  effectiveSessions,
  isSessionMarked,
  isSessionRecordable,
  upcomingSessions,
} from './sessions'

/**
 * The role→buckets builder behind the calendar week-agenda (ADR-0038). Pure
 * and page-agnostic: the caller passes already-scoped lists (the scope seam,
 * ADR-0008/0012, has run before this module ever sees data) and the clock.
 * Everything derives from the inputs — no store, no React, no new state.
 */
export interface BuildAgendaInput {
  role: Role
  courses: Course[]
  attendance: AttendanceRecord[]
  grades: Grade[]
  enrollments: Enrollment[]
  certificates: Certificate[]
  /** The Session exceptions overlay (ADR-0039). Omit for no overlay. */
  sessionExceptions?: SessionException[]
  now: Date
}

/** A past, unmarked {@link Session} enriched for the teacher's worklist. */
export interface NeedsMarkingSession extends Session {
  courseName: string
  sede: Course['sede']
}

export interface RoleAgendaBase {
  /** All upcoming Sessions across the scoped Courses, ascending. */
  upcoming: UpcomingSession[]
}

export interface TeacherAgenda extends RoleAgendaBase {
  role: 'teacher'
  /** Past recordable Sessions with zero attendance yet, ascending (oldest first). */
  needsMarking: NeedsMarkingSession[]
}

export interface AdminAgenda extends RoleAgendaBase {
  role: 'admin'
  /** Summarized operational pulse, not a per-Session firehose (ADR-0038). */
  pulse: {
    unmarkedCount: number
    coursesToCloseCount: number
  }
}

export interface StudentAgenda extends RoleAgendaBase {
  role: 'student'
  progress: AgendaProgressRow[]
}

export interface TcuAgenda extends RoleAgendaBase {
  /** Read-only schedule; the role has no attendance access (ADR-0036). */
  role: 'tcu'
}

/** The student's per-enrollment standing for the agenda sidebar. */
export interface AgendaProgressRow {
  courseName: string
  present: number
  total: number
  onTrack: boolean
  certificate: Certificate | null
}

export type RoleAgenda = TeacherAgenda | AdminAgenda | StudentAgenda | TcuAgenda

/**
 * Derive the role-shaped agenda buckets. Degenerate inputs (no courses, empty
 * attendance, malformed term) return empty buckets, never throw — the
 * derivations bottom out in {@link sessionsFor}, which already absorbs them.
 */
export function buildAgenda(input: BuildAgendaInput): RoleAgenda {
  const { role, courses, attendance, grades, enrollments, certificates, sessionExceptions, now } =
    input
  const upcoming = upcomingSessions(courses, now, undefined, sessionExceptions)

  switch (role) {
    case 'teacher':
      return {
        role,
        upcoming,
        needsMarking: needsMarking(courses, attendance, now, sessionExceptions),
      }
    case 'admin':
      return {
        role,
        upcoming,
        pulse: {
          unmarkedCount: needsMarking(courses, attendance, now, sessionExceptions).length,
          coursesToCloseCount: coursesToClose(courses, now).length,
        },
      }
    case 'student':
      return {
        role,
        upcoming,
        // Rows join through buildStudentProgress (ADR-0032); "on track" is the
        // dashboard's at-risk attendance rule (MIN_ATTENDANCE_RATE), and no
        // records carry no signal — mirrors atRiskStudents.
        progress: buildStudentProgress({
          enrollments,
          courses,
          grades,
          attendance,
          certificates,
        }).map((row) => ({
          courseName: row.course.name,
          present: row.present,
          total: row.total,
          onTrack: row.total === 0 || row.present / row.total >= MIN_ATTENDANCE_RATE,
          certificate: row.certificate,
        })),
      }
    case 'tcu':
      return { role, upcoming }
  }
}

/**
 * Past recordable Sessions (ADR-0034 window) with zero attendance records
 * (the shared {@link isSessionMarked} rule), ascending by date — the most
 * overdue Session first.
 *
 * Scoped to *in-progress* Courses only (Term contains today, ADR-0044): a
 * term-ended Course's unmarked backlog is close-readiness's business on the
 * Courses page (it already blocks closing there), not an operational worklist
 * that should read as abandonment on the calendar.
 */
function needsMarking(
  courses: Course[],
  attendance: AttendanceRecord[],
  now: Date,
  exceptions: SessionException[] = []
): NeedsMarkingSession[] {
  return courses
    .filter((course) => courseDisplayState(course, now) === 'inProgress')
    .flatMap((course) =>
      effectiveSessions(course, exceptions)
        .filter(
          (session) =>
            isSessionRecordable(session, now) &&
            !isSessionMarked(course.id, session.date, attendance)
        )
        .map((session) => ({ ...session, courseName: course.name, sede: course.sede }))
    )
    .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
}
