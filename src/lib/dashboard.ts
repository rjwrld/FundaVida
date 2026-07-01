import { format, isBefore, parseISO, startOfDay, subDays } from 'date-fns'
import type { AttendanceRecord, Course, Enrollment, Grade, Student } from '@/types'
import { SEDES, type Sede } from '@/constants/sede'
import { PASSING_SCORE } from './certificates'

/** Attendance below this present-rate marks a Student at-risk. */
export const MIN_ATTENDANCE_RATE = 0.6

export type AtRiskReason = 'failing' | 'lowAttendance'

export interface AtRiskStudent {
  student: Student
  reasons: AtRiskReason[]
}

/**
 * Courses eligible for the close ceremony (ADR-0024): still `published` but their
 * Term end-date has already passed. Closing them emits the cohort's Certificates,
 * so this is the admin/Teacher's "act on me" worklist. `closed` cohorts are done;
 * `draft` and still-running cohorts are not yet closeable.
 */
export function coursesToClose(courses: Course[], now: Date): Course[] {
  return courses.filter((c) => c.status === 'published' && isBefore(parseISO(c.term.end), now))
}

/**
 * Students who need attention: a failing Grade in any Course, or attendance
 * below {@link MIN_ATTENDANCE_RATE}. Both signals can fire for one Student.
 * Students with no Grades and no attendance carry no signal and are never
 * flagged. Order follows the input `students` order so callers control
 * presentation ordering.
 */
export function atRiskStudents(
  students: Student[],
  grades: Grade[],
  attendance: AttendanceRecord[]
): AtRiskStudent[] {
  const gradesByStudent = new Map<string, Grade[]>()
  grades.forEach((g) => {
    const list = gradesByStudent.get(g.studentId) ?? []
    list.push(g)
    gradesByStudent.set(g.studentId, list)
  })

  const attendanceByStudent = new Map<string, AttendanceRecord[]>()
  attendance.forEach((a) => {
    const list = attendanceByStudent.get(a.studentId) ?? []
    list.push(a)
    attendanceByStudent.set(a.studentId, list)
  })

  const result: AtRiskStudent[] = []
  students.forEach((student) => {
    const reasons: AtRiskReason[] = []

    const studentGrades = gradesByStudent.get(student.id) ?? []
    if (studentGrades.some((g) => g.score < PASSING_SCORE)) {
      reasons.push('failing')
    }

    const records = attendanceByStudent.get(student.id) ?? []
    if (records.length > 0) {
      const presentRate = records.filter((a) => a.status === 'present').length / records.length
      if (presentRate < MIN_ATTENDANCE_RATE) reasons.push('lowAttendance')
    }

    if (reasons.length > 0) result.push({ student, reasons })
  })

  return result
}

export interface SedeFunnel {
  sede: Sede
  pending: number
  approved: number
}

/**
 * The enrollment funnel — pending → approved — grouped by the Sede of each
 * Enrollment's Course. Only `pending` and `approved` feed the funnel; rejected
 * and withdrawn are terminal and excluded. Sedes are returned in {@link SEDES}
 * order, skipping any with no pending or approved enrollments so the card only
 * shows Sedes with live activity.
 */
export function enrollmentFunnelBySede(enrollments: Enrollment[], courses: Course[]): SedeFunnel[] {
  const sedeByCourseId = new Map(courses.map((c) => [c.id, c.sede]))
  const counts = new Map<Sede, { pending: number; approved: number }>()

  enrollments.forEach((e) => {
    if (e.status !== 'pending' && e.status !== 'approved') return
    const sede = sedeByCourseId.get(e.courseId)
    if (!sede) return
    const bucket = counts.get(sede) ?? { pending: 0, approved: 0 }
    bucket[e.status] += 1
    counts.set(sede, bucket)
  })

  return SEDES.filter((sede) => counts.has(sede)).map((sede) => {
    const bucket = counts.get(sede) ?? { pending: 0, approved: 0 }
    return { sede, pending: bucket.pending, approved: bucket.approved }
  })
}

/** Number of days the attendance heatmap covers (7 cols × 12 rows). */
export const HEATMAP_DAYS = 84

export interface HeatmapCell {
  /** `yyyy-MM-dd` of the day this cell represents. */
  date: string
  /** Present-rate for the day (present / total records), 0 when no data. */
  rate: number
}

/**
 * Daily present-rate cells for the attendance heatmap, oldest-to-newest over the
 * last `days` calendar days ending on `now`. A day with no attendance records
 * gets rate 0 (rendered as the empty bucket). Salvaged from the removed Reports
 * module (ADR-0028), re-derived here so the card reads scoped attendance.
 */
export function attendanceHeatmapCells(
  attendance: AttendanceRecord[],
  now: Date,
  days = HEATMAP_DAYS
): HeatmapCell[] {
  const byDay = new Map<string, { present: number; total: number }>()
  attendance.forEach((a) => {
    const key = format(parseISO(a.sessionDate), 'yyyy-MM-dd')
    const bucket = byDay.get(key) ?? { present: 0, total: 0 }
    bucket.total += 1
    if (a.status === 'present') bucket.present += 1
    byDay.set(key, bucket)
  })

  const today = startOfDay(now)
  return Array.from({ length: days }, (_, i) => {
    const date = format(subDays(today, days - 1 - i), 'yyyy-MM-dd')
    const bucket = byDay.get(date)
    const rate = bucket && bucket.total > 0 ? bucket.present / bucket.total : 0
    return { date, rate }
  })
}
