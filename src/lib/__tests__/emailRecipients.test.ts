import { describe, it, expect } from 'vitest'
import type { TFunction } from 'i18next'
import {
  resolveRecipients,
  recipientEmails,
  emailFilterLabel,
  campaignSenderLabel,
  sentRecipientCount,
} from '../emailRecipients'
import { seedDemo } from '@/data/seed'
import type { Program, Student, Course, Enrollment, Teacher } from '@/types'

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
    name: 'Baking — Linda Vista',
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
  // cou-1's Sede sibling: the same cohort taught at another Sede, so the two
  // names differ only in the `— {Sede}` segment. No enrollments, so it is inert
  // to `resolveRecipients` and exists to pin the label collision (ADR-0021).
  {
    id: 'cou-3',
    name: 'Baking — Hatillo',
    description: '',
    sede: 'Hatillo',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: iso(), end: iso() },
    meetingDays: ['wed'],
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

// A stand-in for i18next: echoes the key so the assertions read as key shapes.
const t = ((key: string) => key) as unknown as TFunction

describe('emailFilterLabel', () => {
  const programs: Program[] = [{ id: 'pro-1', name: 'Robótica', description: '' }]
  const names = { programs, courses }

  it('names the filter kind for the value-less "all" filter', () => {
    expect(emailFilterLabel({ kind: 'all' }, names, t)).toBe('bulkEmail.filter.all')
  })

  it('resolves a program filter to the Program name, never its id', () => {
    expect(emailFilterLabel({ kind: 'program', value: 'pro-1' }, names, t)).toBe(
      'bulkEmail.filter.program: Robótica'
    )
  })

  it('falls back to the raw value when the Program is gone', () => {
    expect(emailFilterLabel({ kind: 'program', value: 'pro-9' }, names, t)).toBe(
      'bulkEmail.filter.program: pro-9'
    )
  })

  it('resolves a course filter to the Course name, never its id', () => {
    // The canonical name, Sede segment kept: bulk email is a cross-Sede admin
    // surface, so `shortCourseName` here would collide the per-Sede cohorts
    // that share a Program, Level, and term month (ADR-0021).
    expect(emailFilterLabel({ kind: 'course', value: 'cou-1' }, names, t)).toBe(
      'bulkEmail.filter.course: Baking — Linda Vista'
    )
  })

  it('keeps two Sede siblings distinguishable', () => {
    // The regression this surface actually cares about: stripping the Sede would
    // render both cohorts as "Baking", and the reader could not tell which Sede
    // the campaign reached.
    const linda = emailFilterLabel({ kind: 'course', value: 'cou-1' }, names, t)
    const hatillo = emailFilterLabel({ kind: 'course', value: 'cou-3' }, names, t)
    expect(linda).not.toBe(hatillo)
  })

  it('falls back to the raw value when the Course is gone', () => {
    expect(emailFilterLabel({ kind: 'course', value: 'cou-9' }, names, t)).toBe(
      'bulkEmail.filter.course: cou-9'
    )
  })

  it('appends the raw value for a province filter, which is already a place name', () => {
    expect(emailFilterLabel({ kind: 'province', value: 'San José' }, names, t)).toBe(
      'bulkEmail.filter.province: San José'
    )
  })

  it('omits the suffix when a non-"all" filter has no value yet (a half-filled draft)', () => {
    expect(emailFilterLabel({ kind: 'program' }, names, t)).toBe('bulkEmail.filter.program')
  })
})

describe('campaignSenderLabel', () => {
  const teachers: Teacher[] = [
    {
      id: 'tea-1',
      firstName: 'Jessica',
      lastName: 'Marin',
      email: 'jessica@fv.cr',
      sede: 'Linda Vista',
      province: 'San José',
      canton: '',
      courseIds: ['cou-1'],
      createdAt: iso(),
    },
  ]
  const names = { teachers }

  it('resolves a Teacher id to their name, never the id', () => {
    expect(campaignSenderLabel('tea-1', names, t)).toBe('Jessica Marin')
  })

  it('names the "admin" sentinel, which is no entity id', () => {
    expect(campaignSenderLabel('admin', names, t)).toBe('bulkEmail.sender.admin')
  })

  it('names the "system" sentinel, the sender fallback for an absent user', () => {
    expect(campaignSenderLabel('system', names, t)).toBe('bulkEmail.sender.system')
  })

  it('falls back to the raw value when the Teacher is gone', () => {
    // A campaign is a historical record and outlives the Teacher who sent it,
    // exactly as `emailFilterLabel` reasons about a deleted Course.
    expect(campaignSenderLabel('tea-9', names, t)).toBe('tea-9')
  })

  it('no seeded campaign renders a raw user id or a bare sentinel', () => {
    const snapshot = seedDemo(new Date('2026-06-23T12:00:00.000Z'))
    expect(snapshot.emailCampaigns.length).toBeGreaterThan(0)
    for (const campaign of snapshot.emailCampaigns) {
      const label = campaignSenderLabel(campaign.sentBy, { teachers: snapshot.teachers }, t)
      expect(label).not.toMatch(/^tea-\d+$/)
      expect(label).not.toBe('admin')
      expect(label).not.toBe('system')
    }
  })
})

describe('sentRecipientCount', () => {
  const studentById = new Map(students.map((s) => [s.id, s]))

  it('counts emails, not Students, de-duplicating the Encargado the two share', () => {
    // Both fixture Students have the same Encargado, so a 'both' send reaches
    // three addresses, not 2× the roster (ADR-0041).
    expect(
      sentRecipientCount({ recipientIds: ['stu-1', 'stu-2'], audience: 'both' }, studentById)
    ).toBe(3)
  })

  it('counts one address per Student for a students-only send', () => {
    expect(
      sentRecipientCount({ recipientIds: ['stu-1', 'stu-2'], audience: 'students' }, studentById)
    ).toBe(2)
  })

  it('skips recipient ids the caller cannot resolve, rather than counting a ghost', () => {
    expect(
      sentRecipientCount({ recipientIds: ['stu-1', 'stu-404'], audience: 'students' }, studentById)
    ).toBe(1)
  })

  it('returns zero for a campaign with no stored recipients', () => {
    expect(sentRecipientCount({ recipientIds: [], audience: 'both' }, studentById)).toBe(0)
  })
})
