import { subDays } from 'date-fns'
import type { CourseStatus } from '@/types/domain'

/**
 * Length of the trailing window each metric's growth is measured over. A trailing
 * window (rather than the calendar month) keeps the trend stable no matter where
 * in the month the demo is loaded — the first of the month doesn't reset it to 0.
 */
export const TRAILING_WINDOW_DAYS = 30

/**
 * Month-over-month growth of a cumulative metric: how much the current total
 * grew (or shrank) versus its value at the start of the trailing window. Returns
 * `null` when there is no prior baseline to compare against, so callers can omit
 * the trend rather than divide by zero.
 */
export function monthOverMonthChange(current: number, priorMonthEnd: number): number | null {
  if (priorMonthEnd === 0) return null
  return (current - priorMonthEnd) / priorMonthEnd
}

export interface StatDeltas {
  totalStudents: number | null
  activeCourses: number | null
  certsIssued: number | null
  tcuHours: number | null
}

/** The dated slices of the store that the dashboard headline metrics derive from. */
export interface StatDeltaInput {
  students: readonly { createdAt: string }[]
  courses: readonly { id: string; status: CourseStatus }[]
  enrollments: readonly { courseId: string; enrolledAt: string }[]
  certificates: readonly { issuedAt: string }[]
  tcuActivities: readonly { hours: number; date: string }[]
}

/**
 * Real month-over-month deltas for the four admin headline stats, comparing the
 * current cumulative total against its value at the end of last month. Each is
 * `null` when there's no prior-month baseline (see {@link monthOverMonthChange}).
 */
export function dashboardStatDeltas(data: StatDeltaInput, now: Date): StatDeltas {
  const windowStart = subDays(now, TRAILING_WINDOW_DAYS).getTime()
  const before = (iso?: string) => iso !== undefined && new Date(iso).getTime() < windowStart

  const studentsNow = data.students.length
  const studentsPrior = data.students.filter((s) => before(s.createdAt)).length

  // A course is "active" once it has at least one enrollment and has not been
  // closed (ADR-0024) — a closed cohort with history must not count forever. Both
  // ends of the delta filter on the current status, so a course closed today drops
  // from now and prior alike.
  const openCourseIds = new Set(data.courses.filter((c) => c.status !== 'closed').map((c) => c.id))
  const activeNow = new Set(
    data.enrollments.filter((e) => openCourseIds.has(e.courseId)).map((e) => e.courseId)
  ).size
  const activePrior = new Set(
    data.enrollments
      .filter((e) => before(e.enrolledAt) && openCourseIds.has(e.courseId))
      .map((e) => e.courseId)
  ).size

  // A Certificate is "issued" the moment it exists — closing its Course emits it
  // already downloadable (ADR-0024), dated by `issuedAt`.
  const certsNow = data.certificates.length
  const certsPrior = data.certificates.filter((c) => before(c.issuedAt)).length

  const sumHours = (records: StatDeltaInput['tcuActivities']) =>
    records.reduce((sum, t) => sum + t.hours, 0)
  const hoursNow = sumHours(data.tcuActivities)
  const hoursPrior = sumHours(data.tcuActivities.filter((t) => before(t.date)))

  return {
    totalStudents: monthOverMonthChange(studentsNow, studentsPrior),
    activeCourses: monthOverMonthChange(activeNow, activePrior),
    certsIssued: monthOverMonthChange(certsNow, certsPrior),
    tcuHours: monthOverMonthChange(hoursNow, hoursPrior),
  }
}
