import { describe, it, expect } from 'vitest'
import type { AttendanceRecord, Course, Enrollment, Grade } from '@/types'
import { sessionsFor } from '../sessions'
import { closeReadiness, isTermEnded } from '../closeReadiness'

const NOW = new Date('2026-06-15T12:00:00.000Z')

function makeCourse(overrides: Partial<Course> = {}): Course {
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
    term: { start: '2026-05-04T00:00:00.000Z', end: '2026-05-31T00:00:00.000Z' },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeEnrollment(studentId: string, overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: `enr-${studentId}-${overrides.courseId ?? 'cou-1'}`,
    studentId,
    courseId: 'cou-1',
    enrolledAt: '2026-05-01T00:00:00.000Z',
    status: 'approved',
    requestedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeGrade(studentId: string, overrides: Partial<Grade> = {}): Grade {
  return {
    id: `gra-${studentId}-${overrides.courseId ?? 'cou-1'}`,
    studentId,
    courseId: 'cou-1',
    score: 85,
    issuedAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeAttendance(
  studentId: string,
  sessionDate: string,
  overrides: Partial<AttendanceRecord> = {}
): AttendanceRecord {
  return {
    id: `att-${studentId}-${sessionDate}-${overrides.courseId ?? 'cou-1'}`,
    courseId: 'cou-1',
    studentId,
    sessionDate,
    status: 'present',
    ...overrides,
  }
}

/** Attendance covering every past session of `course` (one record per session). */
function fullAttendance(course: Course, studentId = 's1'): AttendanceRecord[] {
  return sessionsFor(course)
    .filter((s) => new Date(s.date) <= NOW)
    .map((s) => makeAttendance(studentId, s.date, { courseId: course.id }))
}

describe('isTermEnded', () => {
  it('is true when term.end is strictly before now', () => {
    expect(isTermEnded(makeCourse({ term: { start: '2026-01-01', end: '2026-06-01' } }), NOW)).toBe(
      true
    )
  })

  it('is false for an ongoing or future term', () => {
    expect(isTermEnded(makeCourse({ term: { start: '2026-06-01', end: '2026-07-01' } }), NOW)).toBe(
      false
    )
    expect(isTermEnded(makeCourse({ term: { start: '2026-08-01', end: '2026-09-01' } }), NOW)).toBe(
      false
    )
  })
})

describe('closeReadiness', () => {
  // The default course meets Mondays 2026-05-04..2026-05-31: 4 sessions, all past NOW.

  it('is ready when every approved student is graded and every past session is recorded', () => {
    const course = makeCourse()
    const result = closeReadiness({
      course,
      enrollments: [makeEnrollment('s1'), makeEnrollment('s2')],
      grades: [makeGrade('s1'), makeGrade('s2')],
      attendance: fullAttendance(course),
      now: NOW,
    })

    expect(result).toEqual({ ungradedStudentIds: [], unrecordedSessions: [], ready: true })
  })

  it('lists approved students without a grade; non-approved enrollments never need grades', () => {
    const course = makeCourse()
    const result = closeReadiness({
      course,
      enrollments: [
        makeEnrollment('s1'),
        makeEnrollment('s2'),
        makeEnrollment('s3', { status: 'pending' }),
        makeEnrollment('s4', { status: 'rejected' }),
        makeEnrollment('s5', { status: 'withdrawn' }),
      ],
      grades: [makeGrade('s1')],
      attendance: fullAttendance(course),
      now: NOW,
    })

    expect(result.ungradedStudentIds).toEqual(['s2'])
    expect(result.ready).toBe(false)
  })

  it('deduplicates a student with multiple approved enrollments in the course', () => {
    const course = makeCourse()
    const result = closeReadiness({
      course,
      enrollments: [makeEnrollment('s1'), makeEnrollment('s1', { id: 'enr-s1-dup' })],
      grades: [],
      attendance: fullAttendance(course),
      now: NOW,
    })

    expect(result.ungradedStudentIds).toEqual(['s1'])
  })

  it('a grade for a different course does not satisfy coverage', () => {
    const course = makeCourse()
    const result = closeReadiness({
      course,
      enrollments: [makeEnrollment('s1')],
      grades: [makeGrade('s1', { courseId: 'cou-other' })],
      attendance: fullAttendance(course),
      now: NOW,
    })

    expect(result.ungradedStudentIds).toEqual(['s1'])
    expect(result.ready).toBe(false)
  })

  it('any grade counts as coverage regardless of score', () => {
    const course = makeCourse()
    const result = closeReadiness({
      course,
      enrollments: [makeEnrollment('s1')],
      grades: [makeGrade('s1', { score: 10 })],
      attendance: fullAttendance(course),
      now: NOW,
    })

    expect(result.ungradedStudentIds).toEqual([])
  })

  it('reports past sessions with zero attendance records, ascending; one record from any student marks a session recorded', () => {
    const course = makeCourse()
    const sessions = sessionsFor(course) // 4 Mondays: May 4, 11, 18, 25
    expect(sessions).toHaveLength(4)
    const secondSessionDate = sessions.find((s) => s.ordinal === 2)?.date ?? ''

    // Record only the 2nd session (by any single student).
    const result = closeReadiness({
      course,
      enrollments: [makeEnrollment('s1')],
      grades: [makeGrade('s1')],
      attendance: [makeAttendance('s9', secondSessionDate)],
      now: NOW,
    })

    expect(result.unrecordedSessions).toEqual(sessions.filter((s) => s.ordinal !== 2))
    expect(result.unrecordedSessions.map((s) => s.ordinal)).toEqual([1, 3, 4])
    expect(result.ready).toBe(false)
  })

  it('ignores future sessions mid-term: only past sessions can be unrecorded', () => {
    // Mondays 2026-06-01..2026-06-29; NOW is Jun 15 → past sessions are Jun 1, 8, 15.
    const course = makeCourse({
      term: { start: '2026-06-01T00:00:00.000Z', end: '2026-06-29T00:00:00.000Z' },
    })
    const result = closeReadiness({
      course,
      enrollments: [makeEnrollment('s1')],
      grades: [makeGrade('s1')],
      attendance: [],
      now: NOW,
    })

    expect(result.unrecordedSessions.map((s) => s.ordinal)).toEqual([1, 2, 3])
  })

  it('a degenerate course (no meeting days) derives no sessions; verdict rests on grades alone', () => {
    const course = makeCourse({ meetingDays: [] })
    const graded = closeReadiness({
      course,
      enrollments: [makeEnrollment('s1')],
      grades: [makeGrade('s1')],
      attendance: [],
      now: NOW,
    })
    expect(graded).toEqual({ ungradedStudentIds: [], unrecordedSessions: [], ready: true })

    const ungraded = closeReadiness({
      course,
      enrollments: [makeEnrollment('s1')],
      grades: [],
      attendance: [],
      now: NOW,
    })
    expect(ungraded.ready).toBe(false)
  })

  it('an inverted term derives no sessions', () => {
    const course = makeCourse({
      term: { start: '2026-06-01T00:00:00.000Z', end: '2026-05-01T00:00:00.000Z' },
    })
    const result = closeReadiness({
      course,
      enrollments: [],
      grades: [],
      attendance: [],
      now: NOW,
    })
    expect(result).toEqual({ ungradedStudentIds: [], unrecordedSessions: [], ready: true })
  })

  it('ignores unrelated courses’ enrollments, grades, and attendance entirely', () => {
    const course = makeCourse()
    const result = closeReadiness({
      course,
      enrollments: [
        makeEnrollment('s1'),
        makeEnrollment('s9', { courseId: 'cou-other' }), // never listed, never needs a grade
      ],
      grades: [makeGrade('s1')],
      attendance: [
        // Same dates as this course's sessions, but for another course — never counts.
        ...fullAttendance(course).map((a) => ({ ...a, courseId: 'cou-other' })),
      ],
      now: NOW,
    })

    expect(result.ungradedStudentIds).toEqual([])
    expect(result.unrecordedSessions).toHaveLength(4)
    expect(result.ready).toBe(false)
  })
})
