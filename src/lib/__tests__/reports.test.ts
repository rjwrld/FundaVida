import { describe, it, expect } from 'vitest'
import { buildReports } from '../reports'
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  AttendanceRecord,
  TcuActivity,
  TcuTrainee,
} from '@/types'

function iso() {
  return new Date().toISOString()
}

const students: Student[] = [
  {
    id: 'stu-1',
    firstName: 'Ana',
    lastName: 'Mora',
    email: 'a@fv.cr',
    gender: 'F',
    sede: 'Linda Vista',
    province: 'San José',
    canton: 'Central',
    educationalLevel: 'Primary',
    enrolledCourseIds: ['cou-1'],
    createdAt: iso(),
  },
  {
    id: 'stu-2',
    firstName: 'Bruno',
    lastName: 'Li',
    email: 'b@fv.cr',
    gender: 'M',
    sede: 'Linda Vista',
    province: 'Heredia',
    canton: 'Belén',
    educationalLevel: 'Secondary',
    enrolledCourseIds: [],
    createdAt: iso(),
  },
]
const teachers: Teacher[] = [
  {
    id: 'tea-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'j@fv.cr',
    sede: 'Linda Vista',
    courseIds: ['cou-1'],
    createdAt: iso(),
  },
]
const courses: Course[] = [
  {
    id: 'cou-1',
    name: 'Intro to Baking',
    description: '',
    sede: 'Linda Vista',
    programName: 'Culinary',
    teacherId: 'tea-1',
    term: { start: iso(), end: iso() },
    meetingDays: ['mon'],
    createdAt: iso(),
  },
  {
    id: 'cou-2',
    name: 'Accounting Basics',
    description: '',
    sede: 'Linda Vista',
    programName: 'Business',
    teacherId: 'tea-1',
    term: { start: iso(), end: iso() },
    meetingDays: ['tue'],
    createdAt: iso(),
  },
]
const enrollments: Enrollment[] = [
  { id: 'enr-1', studentId: 'stu-1', courseId: 'cou-1', enrolledAt: iso() },
]
const grades: Grade[] = [
  { id: 'gra-1', studentId: 'stu-1', courseId: 'cou-1', score: 80, issuedAt: iso() },
]
const attendance: AttendanceRecord[] = [
  { id: 'att-1', studentId: 'stu-1', courseId: 'cou-1', sessionDate: iso(), status: 'present' },
  { id: 'att-2', studentId: 'stu-1', courseId: 'cou-1', sessionDate: iso(), status: 'absent' },
]
const tcuActivities: TcuActivity[] = [
  { id: 'tcu-act-1', traineeId: 'tcu-1', title: 'X', hours: 4, date: iso() },
  { id: 'tcu-act-2', traineeId: 'tcu-1', title: 'Y', hours: 2, date: iso() },
]
const tcuTrainees: TcuTrainee[] = [
  {
    id: 'tcu-1',
    firstName: 'Juan',
    lastName: 'Pérez',
    email: 'juan@fv.cr',
    sede: 'Linda Vista',
    createdAt: iso(),
  },
]

describe('buildReports', () => {
  it('computes totals', () => {
    const r = buildReports(
      {
        students,
        teachers,
        courses,
        enrollments,
        grades,
        attendance,
        tcuActivities,
      },
      tcuTrainees
    )
    expect(r.totals).toEqual({ students: 2, teachers: 1, courses: 2, enrollments: 1 })
  })

  it('ranks enrollmentsByCourse descending', () => {
    const r = buildReports(
      {
        students,
        teachers,
        courses,
        enrollments,
        grades,
        attendance,
        tcuActivities,
      },
      tcuTrainees
    )
    expect(r.enrollmentsByCourse[0]?.courseId).toBe('cou-1')
    expect(r.enrollmentsByCourse[0]?.count).toBe(1)
  })

  it('returns null average for courses with no grades', () => {
    const r = buildReports(
      {
        students,
        teachers,
        courses,
        enrollments,
        grades,
        attendance,
        tcuActivities,
      },
      tcuTrainees
    )
    const c2 = r.averageGradeByCourse.find((x) => x.courseId === 'cou-2')
    expect(c2?.average).toBeNull()
  })

  it('computes present rate as present / total', () => {
    const r = buildReports(
      {
        students,
        teachers,
        courses,
        enrollments,
        grades,
        attendance,
        tcuActivities,
      },
      tcuTrainees
    )
    const c1 = r.presentRateByCourse.find((x) => x.courseId === 'cou-1')
    expect(c1?.rate).toBe(0.5)
  })

  it('sums tcu hours per student and sorts descending', () => {
    const r = buildReports(
      {
        students,
        teachers,
        courses,
        enrollments,
        grades,
        attendance,
        tcuActivities,
      },
      tcuTrainees
    )
    expect(r.tcuHoursByTrainee[0]?.traineeId).toBe('tcu-1')
    expect(r.tcuHoursByTrainee[0]?.totalHours).toBe(6)
  })

  it('excludes trainees with no tcu activities from tcuHoursByTrainee', () => {
    const r = buildReports(
      {
        students,
        teachers,
        courses,
        enrollments,
        grades,
        attendance,
        tcuActivities,
      },
      tcuTrainees
    )
    expect(
      r.tcuHoursByTrainee.find((x: { traineeId: string }) => x.traineeId === 'tcu-2')
    ).toBeUndefined()
  })
})
