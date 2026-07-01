import { describe, it, expect } from 'vitest'
import type { AttendanceRecord, Course, Enrollment, Grade, Student } from '@/types'
import {
  atRiskStudents,
  attendanceHeatmapCells,
  coursesToClose,
  enrollmentFunnelBySede,
} from '../dashboard'

function makeCourse(overrides: Partial<Course>): Course {
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
    term: { start: '2026-01-01T00:00:00.000Z', end: '2026-06-01T00:00:00.000Z' },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const NOW = new Date('2026-06-15T12:00:00.000Z')

describe('coursesToClose', () => {
  it('returns only published courses whose Term has already ended', () => {
    const past = makeCourse({
      id: 'a',
      status: 'published',
      term: { start: '2026-01-01', end: '2026-06-01' },
    })
    const future = makeCourse({
      id: 'b',
      status: 'published',
      term: { start: '2026-01-01', end: '2026-07-01' },
    })
    const closed = makeCourse({
      id: 'c',
      status: 'closed',
      term: { start: '2026-01-01', end: '2026-05-01' },
    })
    const draft = makeCourse({
      id: 'd',
      status: 'draft',
      term: { start: '2026-01-01', end: '2026-05-01' },
    })

    const result = coursesToClose([past, future, closed, draft], NOW)

    expect(result.map((c) => c.id)).toEqual(['a'])
  })
})

function makeStudent(id: string): Student {
  return {
    id,
    firstName: 'A',
    lastName: 'B',
    email: `${id}@x.cr`,
    gender: 'F',
    sede: 'Hatillo',
    province: 'San José',
    canton: 'Central',
    educationalLevel: 'primaria',
    guardian: { name: 'G', relationship: 'madre', phone: '', email: '' },
    enrolledCourseIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function makeGrade(studentId: string, score: number): Grade {
  return {
    id: `gra-${studentId}-${score}`,
    studentId,
    courseId: 'cou-1',
    score,
    issuedAt: '2026-06-01',
  }
}

function makeAttendance(studentId: string, status: AttendanceRecord['status']): AttendanceRecord {
  return {
    id: `att-${studentId}-${status}-${Math.random()}`,
    courseId: 'cou-1',
    studentId,
    sessionDate: '2026-06-01',
    status,
  }
}

describe('atRiskStudents', () => {
  it('flags students with a failing grade or low attendance, with the reason', () => {
    const s1 = makeStudent('s1') // failing grade 65
    const s2 = makeStudent('s2') // 1/4 present -> low attendance
    const s3 = makeStudent('s3') // passing + full attendance -> ok
    const s4 = makeStudent('s4') // no signal -> ok

    const grades: Grade[] = [makeGrade('s1', 65), makeGrade('s2', 85), makeGrade('s3', 90)]
    const attendance: AttendanceRecord[] = [
      makeAttendance('s2', 'present'),
      makeAttendance('s2', 'absent'),
      makeAttendance('s2', 'absent'),
      makeAttendance('s2', 'absent'),
      makeAttendance('s3', 'present'),
      makeAttendance('s3', 'present'),
    ]

    const result = atRiskStudents([s1, s2, s3, s4], grades, attendance)

    expect(result.map((r) => r.student.id)).toEqual(['s1', 's2'])
    expect(result[0]?.reasons).toEqual(['failing'])
    expect(result[1]?.reasons).toEqual(['lowAttendance'])
  })
})

function makeEnrollment(courseId: string, status: Enrollment['status']): Enrollment {
  return {
    id: `enr-${courseId}-${status}-${Math.random()}`,
    studentId: 'stu-1',
    courseId,
    enrolledAt: '2026-05-01',
    status,
    requestedAt: '2026-05-01',
  }
}

describe('enrollmentFunnelBySede', () => {
  it('counts pending vs approved per Sede in SEDES order, skipping Sedes with no activity', () => {
    const courses = [
      makeCourse({ id: 'cx', sede: 'Hatillo' }),
      makeCourse({ id: 'cy', sede: 'Alajuelita' }),
    ]
    const enrollments = [
      makeEnrollment('cx', 'pending'),
      makeEnrollment('cx', 'pending'),
      makeEnrollment('cx', 'approved'),
      makeEnrollment('cx', 'approved'),
      makeEnrollment('cx', 'approved'),
      makeEnrollment('cx', 'rejected'),
      makeEnrollment('cy', 'pending'),
    ]

    const result = enrollmentFunnelBySede(enrollments, courses)

    expect(result).toEqual([
      { sede: 'Hatillo', pending: 2, approved: 3 },
      { sede: 'Alajuelita', pending: 1, approved: 0 },
    ])
  })
})

describe('attendanceHeatmapCells', () => {
  it('emits one oldest-to-newest cell per day with its present-rate; empty days rate 0', () => {
    const records: AttendanceRecord[] = [
      makeAttendance('s1', 'present'),
      makeAttendance('s2', 'present'),
      makeAttendance('s3', 'absent'),
      makeAttendance('s4', 'absent'),
    ].map((r) => ({ ...r, sessionDate: '2026-06-15' }))
    records.push({ ...makeAttendance('s5', 'present'), sessionDate: '2026-06-14' })

    const cells = attendanceHeatmapCells(records, NOW, 3)

    expect(cells).toEqual([
      { date: '2026-06-13', rate: 0 },
      { date: '2026-06-14', rate: 1 },
      { date: '2026-06-15', rate: 0.5 },
    ])
  })
})
