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
  const NOW = new Date('2026-06-15T12:00:00') // trailing-30 window starts 2026-05-16
  const OLD = '2026-04-01T10:00:00.000Z' // older than 30 days → prior baseline
  const RECENT = '2026-06-01T10:00:00.000Z' // within the last 30 days → lifts the trend

  it('derives the trailing-30-day growth for each metric from dated records', () => {
    const deltas = dashboardStatDeltas(
      {
        // 2 predate the window, 1 added within it → 3 vs 2
        students: [{ createdAt: OLD }, { createdAt: OLD }, { createdAt: RECENT }],
        // cou-a active before the window; cou-b first enrolled within it → 2 vs 1
        enrollments: [
          { courseId: 'cou-a', enrolledAt: OLD },
          { courseId: 'cou-a', enrolledAt: RECENT },
          { courseId: 'cou-b', enrolledAt: RECENT },
        ],
        // 1 issued before the window, 1 within it → 2 vs 1
        certificates: [{ issuedAt: OLD }, { issuedAt: RECENT }],
        // 10h before the window, 5h within it → 15 vs 10
        tcuActivities: [
          { hours: 10, date: OLD },
          { hours: 5, date: RECENT },
        ],
      },
      NOW
    )

    expect(deltas.totalStudents).toBeCloseTo(0.5)
    expect(deltas.activeCourses).toBeCloseTo(1)
    expect(deltas.certsIssued).toBeCloseTo(1)
    expect(deltas.tcuHours).toBeCloseTo(0.5)
  })

  it('uses a trailing 30-day window, not the calendar month', () => {
    // now = June 5; a May 20 record is in the PREVIOUS calendar month but still
    // within the last 30 days, so it must count as recent growth, not baseline.
    const now = new Date('2026-06-05T12:00:00')
    const deltas = dashboardStatDeltas(
      {
        students: [
          { createdAt: '2026-04-01T10:00:00.000Z' },
          { createdAt: '2026-05-20T10:00:00.000Z' },
        ],
        enrollments: [],
        certificates: [],
        tcuActivities: [],
      },
      now
    )
    // current 2 vs baseline 1 (only the April record predates the window) → +100%
    expect(deltas.totalStudents).toBeCloseTo(1)
  })

  it('returns null for a metric with no history before the window', () => {
    const deltas = dashboardStatDeltas(
      {
        students: [{ createdAt: RECENT }],
        enrollments: [{ courseId: 'cou-a', enrolledAt: RECENT }],
        certificates: [{ issuedAt: RECENT }],
        tcuActivities: [{ hours: 4, date: RECENT }],
      },
      NOW
    )

    expect(deltas.totalStudents).toBeNull()
    expect(deltas.activeCourses).toBeNull()
    expect(deltas.certsIssued).toBeNull()
    expect(deltas.tcuHours).toBeNull()
  })
})
