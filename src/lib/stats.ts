import { startOfMonth } from 'date-fns'

/**
 * Month-over-month growth of a cumulative metric: how much the current total
 * grew (or shrank) versus its value at the end of last month. Returns `null`
 * when there is no prior baseline to compare against, so callers can omit the
 * trend rather than divide by zero.
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
  enrollments: readonly { courseId: string; enrolledAt: string }[]
  certificates: readonly { status: 'pending' | 'approved'; approvedAt?: string }[]
  tcuActivities: readonly { hours: number; date: string }[]
}

/**
 * Real month-over-month deltas for the four admin headline stats, comparing the
 * current cumulative total against its value at the end of last month. Each is
 * `null` when there's no prior-month baseline (see {@link monthOverMonthChange}).
 */
export function dashboardStatDeltas(data: StatDeltaInput, now: Date): StatDeltas {
  const monthStart = startOfMonth(now).getTime()
  const before = (iso?: string) => iso !== undefined && new Date(iso).getTime() < monthStart

  const studentsNow = data.students.length
  const studentsPrior = data.students.filter((s) => before(s.createdAt)).length

  // A course is "active" once it has at least one enrollment.
  const activeNow = new Set(data.enrollments.map((e) => e.courseId)).size
  const activePrior = new Set(
    data.enrollments.filter((e) => before(e.enrolledAt)).map((e) => e.courseId)
  ).size

  const approved = data.certificates.filter((c) => c.status === 'approved')
  const certsNow = approved.length
  const certsPrior = approved.filter((c) => before(c.approvedAt)).length

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
