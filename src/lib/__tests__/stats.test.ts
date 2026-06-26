import { describe, it, expect } from 'vitest'
import { dashboardStatDeltas, monthOverMonthChange } from '../stats'

describe('monthOverMonthChange', () => {
  it('returns the fractional growth from the prior month-end value', () => {
    expect(monthOverMonthChange(110, 100)).toBeCloseTo(0.1)
  })

  it('returns a negative fraction when the metric shrank', () => {
    expect(monthOverMonthChange(90, 100)).toBeCloseTo(-0.1)
  })

  it('returns exactly 0 when nothing changed', () => {
    expect(monthOverMonthChange(100, 100)).toBe(0)
  })

  it('returns null when there is no prior baseline (avoids ÷0)', () => {
    expect(monthOverMonthChange(5, 0)).toBeNull()
  })
})

describe('dashboardStatDeltas', () => {
  const NOW = new Date('2026-06-15T12:00:00') // start of month = 2026-06-01
  const MAY = '2026-05-20T10:00:00.000Z' // counts toward the prior month-end baseline
  const JUNE = '2026-06-10T10:00:00.000Z' // added this month, lifts the trend

  it('derives month-over-month growth for each metric from dated records', () => {
    const deltas = dashboardStatDeltas(
      {
        // 2 existed before June, 1 added in June → 3 vs 2
        students: [{ createdAt: MAY }, { createdAt: MAY }, { createdAt: JUNE }],
        // cou-a active before June; cou-b first enrolled in June → 2 vs 1
        enrollments: [
          { courseId: 'cou-a', enrolledAt: MAY },
          { courseId: 'cou-a', enrolledAt: JUNE },
          { courseId: 'cou-b', enrolledAt: JUNE },
        ],
        // 1 approved before June, 1 approved in June; a pending one is ignored → 2 vs 1
        certificates: [
          { status: 'approved', approvedAt: MAY },
          { status: 'approved', approvedAt: JUNE },
          { status: 'pending' },
        ],
        // 10h before June, 5h in June → 15 vs 10
        tcuActivities: [
          { hours: 10, date: MAY },
          { hours: 5, date: JUNE },
        ],
      },
      NOW
    )

    expect(deltas.totalStudents).toBeCloseTo(0.5)
    expect(deltas.activeCourses).toBeCloseTo(1)
    expect(deltas.certsIssued).toBeCloseTo(1)
    expect(deltas.tcuHours).toBeCloseTo(0.5)
  })

  it('returns null for a metric with no prior-month history', () => {
    const deltas = dashboardStatDeltas(
      {
        students: [{ createdAt: JUNE }],
        enrollments: [{ courseId: 'cou-a', enrolledAt: JUNE }],
        certificates: [{ status: 'approved', approvedAt: JUNE }],
        tcuActivities: [{ hours: 4, date: JUNE }],
      },
      NOW
    )

    expect(deltas.totalStudents).toBeNull()
    expect(deltas.activeCourses).toBeNull()
    expect(deltas.certsIssued).toBeNull()
    expect(deltas.tcuHours).toBeNull()
  })
})
