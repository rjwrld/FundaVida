import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'
import { resolveRecipients, recipientEmails, emailFilterLabel } from '../emailRecipients'
import type { Program, Student, Course, Enrollment } from '@/types'

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
    guardian: {
      name: 'Encargado Test',
      relationship: 'madre',
      phone: '8888-8888',
      email: 'enc@example.com',
    },
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
    guardian: {
      name: 'Encargado Test',
      relationship: 'madre',
      phone: '8888-8888',
      email: 'enc@example.com',
    },
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
    level: 'primaria',
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
    level: 'primaria',
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

describe('recipientEmails', () => {
  it('audience=students maps to each Student own email', () => {
    expect(recipientEmails(students, 'students')).toEqual(['a@fv.cr', 'b@fv.cr'])
  })

  it('audience=guardians maps to Encargado emails, de-duplicated', () => {
    // Both fixture Students share one Encargado, so the guardian send reaches
    // that adult once — the count is emails, not Students.
    expect(recipientEmails(students, 'guardians')).toEqual(['enc@example.com'])
  })

  it('audience=both interleaves own + guardian emails, de-duplicated', () => {
    expect(recipientEmails(students, 'both')).toEqual(['a@fv.cr', 'enc@example.com', 'b@fv.cr'])
  })

  it('returns [] for no students', () => {
    expect(recipientEmails([], 'both')).toEqual([])
  })
})

describe('emailFilterLabel', () => {
  // A stand-in for i18next: echoes the key so the assertions read as key shapes.
  const t = ((key: string) => key) as unknown as TFunction
  const programs: Program[] = [{ id: 'pro-1', name: 'Robótica', description: '' }]

  it('names the filter kind for the value-less "all" filter', () => {
    expect(emailFilterLabel({ kind: 'all' }, programs, t)).toBe('bulkEmail.filter.all')
  })

  it('resolves a program filter to the Program name, never its id', () => {
    expect(emailFilterLabel({ kind: 'program', value: 'pro-1' }, programs, t)).toBe(
      'bulkEmail.filter.program: Robótica'
    )
  })

  it('falls back to the raw value when the Program is gone', () => {
    expect(emailFilterLabel({ kind: 'program', value: 'pro-9' }, programs, t)).toBe(
      'bulkEmail.filter.program: pro-9'
    )
  })

  it('appends the raw value for province and course filters', () => {
    expect(emailFilterLabel({ kind: 'province', value: 'San José' }, programs, t)).toBe(
      'bulkEmail.filter.province: San José'
    )
    expect(emailFilterLabel({ kind: 'course', value: 'cou-1' }, programs, t)).toBe(
      'bulkEmail.filter.course: cou-1'
    )
  })

  it('omits the suffix when a non-"all" filter has no value yet (a half-filled draft)', () => {
    expect(emailFilterLabel({ kind: 'program' }, programs, t)).toBe('bulkEmail.filter.program')
  })
})
