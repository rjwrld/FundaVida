import { describe, it, expect } from 'vitest'
import { addDays, startOfDay, subDays } from 'date-fns'
import type { AttendanceRecord, Course } from '@/types'
import { attendanceRollup } from '../attendanceRollup'

/** A Wednesday at noon; Monday-only Courses meet Jun 8 and Jun 15 before it. */
const NOW = new Date(2026, 5, 17, 12, 0)
const JUN_8 = startOfDay(subDays(NOW, 9)).toISOString()
const JUN_15 = startOfDay(subDays(NOW, 2)).toISOString()

function makeCourse(id: string, overrides: Partial<Course> = {}): Course {
  return {
    id,
    name: `Course ${id}`,
    description: '',
    sede: 'Hatillo',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: {
      start: startOfDay(subDays(NOW, 14)).toISOString(),
      end: startOfDay(addDays(NOW, 14)).toISOString(),
    },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

let n = 0
function record(
  courseId: string,
  sessionDate: string,
  status: AttendanceRecord['status'] = 'present'
): AttendanceRecord {
  n += 1
  return { id: `att-${n}`, courseId, studentId: `stu-${n}`, sessionDate, status }
}

describe('attendanceRollup', () => {
  it('rolls one Course up into sessions held, attendance rate, and unmarked sessions', () => {
    const course = makeCourse('cou-1')
    const rows = attendanceRollup({
      courses: [course],
      attendance: [
        record('cou-1', JUN_8, 'present'),
        record('cou-1', JUN_8, 'present'),
        record('cou-1', JUN_8, 'absent'),
        record('cou-1', JUN_8, 'present'),
      ],
      now: NOW,
    })

    expect(rows).toEqual([{ course, sessionsHeld: 2, rate: 0.75, unmarked: 1, live: true }])
  })

  it('carries no rate when nothing has been recorded yet', () => {
    const rows = attendanceRollup({ courses: [makeCourse('cou-1')], attendance: [], now: NOW })

    expect(rows[0]?.rate).toBeNull()
    expect(rows[0]?.unmarked).toBe(2)
  })

  it('leaves out a Course that has not held a Session yet', () => {
    const upcoming = makeCourse('cou-up', {
      term: {
        start: startOfDay(addDays(NOW, 5)).toISOString(),
        end: startOfDay(addDays(NOW, 40)).toISOString(),
      },
    })

    expect(attendanceRollup({ courses: [upcoming], attendance: [], now: NOW })).toEqual([])
  })

  // Worst first: the live cohorts with the most unmarked Sessions lead, then the
  // lowest attendance. A closed cohort's gaps are final (ADR-0024), so they never
  // outrank a cohort that can still be marked.
  it('sorts live unmarked work first, then the lowest attendance rate', () => {
    const low = makeCourse('cou-low')
    const high = makeCourse('cou-high')
    const backlog = makeCourse('cou-backlog')
    const closed = makeCourse('cou-closed', { status: 'closed' })
    const rows = attendanceRollup({
      courses: [high, closed, low, backlog],
      attendance: [
        record('cou-high', JUN_8, 'present'),
        record('cou-high', JUN_15, 'present'),
        record('cou-low', JUN_8, 'absent'),
        record('cou-low', JUN_15, 'present'),
        record('cou-backlog', JUN_15, 'present'),
      ],
      now: NOW,
    })

    expect(rows.map((r) => r.course.id)).toEqual([
      'cou-backlog',
      'cou-closed',
      'cou-low',
      'cou-high',
    ])
    expect(rows.find((r) => r.course.id === 'cou-closed')).toMatchObject({
      unmarked: 2,
      live: false,
    })
  })

  it('counts a Session held only through the exceptions overlay (ADR-0039)', () => {
    const course = makeCourse('cou-1')
    const rows = attendanceRollup({
      courses: [course],
      attendance: [],
      sessionExceptions: [
        { id: 'ex-1', courseId: 'cou-1', type: 'cancelled', date: JUN_8, createdAt: JUN_8 },
      ],
      now: NOW,
    })

    expect(rows[0]?.sessionsHeld).toBe(1)
  })
})
