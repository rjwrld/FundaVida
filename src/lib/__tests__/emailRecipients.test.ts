import { describe, it, expect } from 'vitest'
import { resolveRecipients } from '../emailRecipients'
import type { Student, Course, Enrollment } from '@/types'

function iso() {
  return new Date().toISOString()
}

const students: Student[] = [
  {
    id: 'stu-1',
    firstName: 'A',
    lastName: 'A',
    email: 'a@fv.cr',
    gender: 'F',
    sede: 'Linda Vista',
    province: 'San José',
    canton: '',
    educationalLevel: 'primaria',
    enrolledCourseIds: ['cou-1'],
    createdAt: iso(),
  },
  {
    id: 'stu-2',
    firstName: 'B',
    lastName: 'B',
    email: 'b@fv.cr',
    gender: 'M',
    sede: 'Linda Vista',
    province: 'Heredia',
    canton: '',
    educationalLevel: 'secundaria',
    enrolledCourseIds: [],
    createdAt: iso(),
  },
]
const courses: Course[] = [
  {
    id: 'cou-1',
    name: 'Baking',
    description: '',
    sede: 'Linda Vista',
    programId: 'prog-1',
    level: 'both',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: iso(), end: iso() },
    meetingDays: ['mon'],
    createdAt: iso(),
  },
  {
    id: 'cou-2',
    name: 'Accounting',
    description: '',
    sede: 'Linda Vista',
    programId: 'prog-1',
    level: 'both',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: iso(), end: iso() },
    meetingDays: ['tue'],
    createdAt: iso(),
  },
]
const enrollments: Enrollment[] = [
  {
    id: 'enr-1',
    studentId: 'stu-1',
    courseId: 'cou-1',
    enrolledAt: iso(),
    status: 'approved',
    requestedAt: iso(),
  },
]

describe('resolveRecipients', () => {
  it('kind=all returns all students', () => {
    const r = resolveRecipients({ kind: 'all' }, { students, courses, enrollments })
    expect(r.map((s) => s.id).sort()).toEqual(['stu-1', 'stu-2'])
  })

  it('kind=province filters by province', () => {
    const r = resolveRecipients(
      { kind: 'province', value: 'San José' },
      { students, courses, enrollments }
    )
    expect(r.map((s) => s.id)).toEqual(['stu-1'])
  })

  it('kind=program filters by enrolled course program (by programId)', () => {
    const r = resolveRecipients(
      { kind: 'program', value: 'prog-1' },
      { students, courses, enrollments }
    )
    expect(r.map((s) => s.id)).toEqual(['stu-1'])
  })

  it('kind=course filters by enrolled courseId', () => {
    const r = resolveRecipients(
      { kind: 'course', value: 'cou-1' },
      { students, courses, enrollments }
    )
    expect(r.map((s) => s.id)).toEqual(['stu-1'])
  })

  it('returns [] when value is missing for a filter that requires it', () => {
    const r = resolveRecipients({ kind: 'program' }, { students, courses, enrollments })
    expect(r).toEqual([])
  })
})
