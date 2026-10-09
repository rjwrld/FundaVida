import { describe, it, expect } from 'vitest'
import { addDays, startOfDay, subDays } from 'date-fns'
import type { Course, Enrollment } from '@/types'
import { enrollmentRequestState } from '../enrollmentRequest'

const NOW = new Date(2026, 9, 8, 12, 0)

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 'cou-1',
    name: 'Course',
    description: '',
    sede: 'Hatillo',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: {
      start: startOfDay(addDays(NOW, 5)).toISOString(),
      end: startOfDay(addDays(NOW, 60)).toISOString(),
    },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function enrollment(status: Enrollment['status']): Enrollment {
  return {
    id: 'enr-1',
    studentId: 'stu-1',
    courseId: 'cou-1',
    status,
    requestedAt: NOW.toISOString(),
    enrolledAt: NOW.toISOString(),
  }
}

describe('enrollmentRequestState — one rule for Browse and the Course page', () => {
  it('offers a request on an open course with no active enrollment', () => {
    expect(enrollmentRequestState(course(), undefined, NOW)).toBe('request')
  })

  it('reads a pending request as requested and an approved one as enrolled', () => {
    expect(enrollmentRequestState(course(), enrollment('pending'), NOW)).toBe('requested')
    expect(enrollmentRequestState(course(), enrollment('approved'), NOW)).toBe('enrolled')
  })

  // The store re-pends a withdrawn or rejected record (ADR-0016).
  it('offers a request again after a withdrawal or a rejection', () => {
    expect(enrollmentRequestState(course(), enrollment('withdrawn'), NOW)).toBe('request')
    expect(enrollmentRequestState(course(), enrollment('rejected'), NOW)).toBe('request')
  })

  // The store's enrollment window (ADR-0042): Term ended, draft, or closed.
  it('closes the request once the course no longer takes enrollments', () => {
    const ended = course({
      term: {
        start: startOfDay(subDays(NOW, 60)).toISOString(),
        end: startOfDay(subDays(NOW, 1)).toISOString(),
      },
    })
    expect(enrollmentRequestState(ended, undefined, NOW)).toBe('closed')
    expect(enrollmentRequestState(course({ status: 'draft' }), undefined, NOW)).toBe('closed')
    expect(enrollmentRequestState(course({ status: 'closed' }), undefined, NOW)).toBe('closed')
  })
})
