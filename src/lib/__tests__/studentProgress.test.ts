import { describe, it, expect } from 'vitest'
import type { AttendanceRecord, Certificate, Course, Enrollment, Grade } from '@/types'
import { buildStudentProgress } from '../studentProgress'

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
    term: { start: '2026-05-04T00:00:00.000Z', end: '2026-05-31T00:00:00.000Z' },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeEnrollment(courseId: string, overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: `enr-${courseId}`,
    studentId: 'stu-1',
    courseId,
    enrolledAt: '2026-05-01T00:00:00.000Z',
    status: 'approved',
    requestedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeGrade(courseId: string, score: number): Grade {
  return {
    id: `gra-${courseId}`,
    studentId: 'stu-1',
    courseId,
    score,
    issuedAt: '2026-06-01T00:00:00.000Z',
  }
}

function makeCert(courseId: string, score: number): Certificate {
  return {
    id: `cer-${courseId}`,
    studentId: 'stu-1',
    courseId,
    score,
    issuedAt: '2026-06-02T00:00:00.000Z',
  }
}

function makeAttendance(
  courseId: string,
  status: AttendanceRecord['status'],
  n: number
): AttendanceRecord {
  return {
    id: `att-${courseId}-${status}-${n}`,
    courseId,
    studentId: 'stu-1',
    sessionDate: '2026-05-10T00:00:00.000Z',
    status,
  }
}

describe('buildStudentProgress', () => {
  it('joins each enrollment to its course, grade, certificate, and attendance', () => {
    const rows = buildStudentProgress({
      enrollments: [makeEnrollment('cou-1')],
      courses: [makeCourse('cou-1')],
      grades: [makeGrade('cou-1', 88)],
      certificates: [makeCert('cou-1', 88)],
      attendance: [makeAttendance('cou-1', 'present', 1), makeAttendance('cou-1', 'absent', 2)],
    })

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row?.enrollment.courseId).toBe('cou-1')
    expect(row?.course.id).toBe('cou-1')
    expect(row?.grade?.score).toBe(88)
    expect(row?.certificate?.id).toBe('cer-cou-1')
    expect(row?.attendanceRate).toBe(0.5)
  })

  it('leaves grade/certificate/attendance null when none join the course', () => {
    const rows = buildStudentProgress({
      enrollments: [makeEnrollment('cou-1')],
      courses: [makeCourse('cou-1')],
      grades: [],
      certificates: [],
      attendance: [],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.grade).toBeNull()
    expect(rows[0]?.certificate).toBeNull()
    expect(rows[0]?.attendanceRate).toBeNull()
  })

  it('surfaces raw present/total counts alongside the rate (ADR-0038)', () => {
    const rows = buildStudentProgress({
      enrollments: [makeEnrollment('cou-1')],
      courses: [makeCourse('cou-1')],
      grades: [],
      certificates: [],
      attendance: [
        makeAttendance('cou-1', 'present', 1),
        makeAttendance('cou-1', 'present', 2),
        makeAttendance('cou-1', 'absent', 3),
      ],
    })

    expect(rows[0]?.present).toBe(2)
    expect(rows[0]?.total).toBe(3)
  })

  it('counts are zero when the course has no attendance records', () => {
    const rows = buildStudentProgress({
      enrollments: [makeEnrollment('cou-1')],
      courses: [makeCourse('cou-1')],
      grades: [],
      certificates: [],
      attendance: [],
    })

    expect(rows[0]?.present).toBe(0)
    expect(rows[0]?.total).toBe(0)
    expect(rows[0]?.attendanceRate).toBeNull()
  })

  it('computes the attendance rate as present / total', () => {
    const rows = buildStudentProgress({
      enrollments: [makeEnrollment('cou-1')],
      courses: [makeCourse('cou-1')],
      grades: [],
      certificates: [],
      attendance: [
        makeAttendance('cou-1', 'present', 1),
        makeAttendance('cou-1', 'present', 2),
        makeAttendance('cou-1', 'present', 3),
        makeAttendance('cou-1', 'absent', 4),
        // 'excused' counts toward total but not present
        makeAttendance('cou-1', 'excused', 5),
      ],
    })

    expect(rows[0]?.attendanceRate).toBe(3 / 5)
  })

  it('skips an enrollment whose course is missing', () => {
    const rows = buildStudentProgress({
      enrollments: [makeEnrollment('cou-1'), makeEnrollment('cou-gone')],
      courses: [makeCourse('cou-1')],
      grades: [],
      certificates: [],
      attendance: [],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]?.course.id).toBe('cou-1')
  })

  it('preserves enrollment order and only attaches records for the matching course', () => {
    const rows = buildStudentProgress({
      enrollments: [makeEnrollment('cou-1'), makeEnrollment('cou-2')],
      courses: [makeCourse('cou-1'), makeCourse('cou-2')],
      grades: [makeGrade('cou-2', 71)],
      certificates: [],
      attendance: [makeAttendance('cou-1', 'present', 1)],
    })

    expect(rows.map((r) => r.course.id)).toEqual(['cou-1', 'cou-2'])
    expect(rows[0]?.attendanceRate).toBe(1)
    expect(rows[0]?.grade).toBeNull()
    expect(rows[1]?.attendanceRate).toBeNull()
    expect(rows[1]?.grade?.score).toBe(71)
  })

  it('returns an empty list when there are no enrollments', () => {
    expect(
      buildStudentProgress({
        enrollments: [],
        courses: [makeCourse('cou-1')],
        grades: [makeGrade('cou-1', 90)],
        certificates: [],
        attendance: [],
      })
    ).toEqual([])
  })
})
