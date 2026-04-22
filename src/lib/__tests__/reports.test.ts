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
    courseIds: ['cou-1'],
    createdAt: iso(),
  },
]
const courses: Course[] = [
  {
    id: 'cou-1',
    name: 'Intro to Baking',
    description: '',
    headquartersName: 'HQ',
    programName: 'Culinary',
    teacherId: 'tea-1',
    createdAt: iso(),
  },
  {
    id: 'cou-2',
    name: 'Accounting Basics',
    description: '',
    headquartersName: 'HQ',
    programName: 'Business',
    teacherId: 'tea-1',
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
  { id: 'tcu-act-1', studentId: 'stu-1', title: 'X', description: '', hours: 4, date: iso() },
  { id: 'tcu-act-2', studentId: 'stu-1', title: 'Y', description: '', hours: 2, date: iso() },
]

describe('buildReports', () => {
  it('computes totals', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    expect(r.totals).toEqual({ students: 2, teachers: 1, courses: 2, enrollments: 1 })
  })

  it('ranks enrollmentsByCourse descending', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    expect(r.enrollmentsByCourse[0]?.courseId).toBe('cou-1')
    expect(r.enrollmentsByCourse[0]?.count).toBe(1)
  })

  it('returns null average for courses with no grades', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    const c2 = r.averageGradeByCourse.find((x) => x.courseId === 'cou-2')
    expect(c2?.average).toBeNull()
  })

  it('computes present rate as present / total', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    const c1 = r.presentRateByCourse.find((x) => x.courseId === 'cou-1')
    expect(c1?.rate).toBe(0.5)
  })

  it('sums tcu hours per student and sorts descending', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    expect(r.tcuHoursByStudent[0]?.studentId).toBe('stu-1')
    expect(r.tcuHoursByStudent[0]?.totalHours).toBe(6)
  })

  it('excludes students with no tcu activities from tcuHoursByStudent', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    expect(r.tcuHoursByStudent.find((x) => x.studentId === 'stu-2')).toBeUndefined()
  })
})
