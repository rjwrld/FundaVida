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

/**
 * The teacher worklist grouped by Course (ADR-0044): one row per Course with a
 * count and a deep link to the *oldest* unmarked Session's mark page — never a
 * row-per-session wall. `oldestDate` is that deep-link target.
 */
export interface WorklistGroup {
  courseId: string
  courseName: string
  sede: Course['sede']
  count: number
  oldestDate: string
}

export interface RoleAgendaBase {
  /** All upcoming Sessions across the scoped Courses, ascending. */
  upcoming: UpcomingSession[]
}

export interface TeacherAgenda extends RoleAgendaBase {
  role: 'teacher'
  /** Past recordable Sessions with zero attendance yet, ascending (oldest first). */
  needsMarking: NeedsMarkingSession[]
  /** The same backlog grouped by Course for the sidebar worklist (ADR-0044). */
  worklist: WorklistGroup[]
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
  sede: Course['sede']
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
    case 'teacher': {
      const marking = needsMarking(courses, attendance, now, sessionExceptions)
      return {
        role,
        upcoming,
        needsMarking: marking,
        worklist: groupWorklist(marking),
      }
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
          sede: row.course.sede,
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

/**
 * Collapse the ascending {@link needsMarking} list into one {@link WorklistGroup}
 * per Course (ADR-0044). Groups keep the input's ascending order, so the first
 * Session seen for a Course is its oldest — that becomes the deep-link target —
 * and the groups themselves stay ordered by their oldest Session (most overdue
 * Course first).
 */
function groupWorklist(sessions: NeedsMarkingSession[]): WorklistGroup[] {
  const groups = new Map<string, WorklistGroup>()
  for (const session of sessions) {
    const existing = groups.get(session.courseId)
    if (existing) {
      existing.count += 1
    } else {
      groups.set(session.courseId, {
        courseId: session.courseId,
        courseName: session.courseName,
        sede: session.sede,
        count: 1,
        oldestDate: session.date,
      })
    }
  }
  return [...groups.values()]
}
