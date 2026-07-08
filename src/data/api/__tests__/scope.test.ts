import { describe, it, expect } from 'vitest'
import { applyScope, ownCourseIds, type ScopeContext } from '../scope'
import type { Course, Student, Enrollment, Certificate, TcuTrainee } from '@/types'

// These are pure scope-rule units (ADR-0033): a scenario is a small hand-built
// ScopeContext, not a resetDemo/setRole/store-mutation sequence. End-to-end
// scoping (scopeFor + applyScope + slice) is covered by the api-surface tests.

function makeCourse(over: Partial<Course> = {}): Course {
  return {
    id: 'cou-1',
    name: 'Course',
    description: '',
    sede: 'Linda Vista',
    programId: 'prog-1',
    level: 'primaria',
    status: 'published',
    capacity: 20,
    teacherId: 'tea-1',
    term: { start: '2026-01-01', end: '2026-06-01' },
    meetingDays: ['mon'],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function makeStudent(over: Partial<Student> = {}): Student {
  return {
    id: 'stu-1',
    firstName: 'A',
    lastName: 'B',
    email: 'a@b.co',
    gender: 'F',
    sede: 'Linda Vista',
    province: 'San José',
    canton: 'Central',
    educationalLevel: 'primaria',
    guardian: { name: 'G', relationship: 'madre', phone: '', email: '' },
    enrolledCourseIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function makeEnrollment(over: Partial<Enrollment> = {}): Enrollment {
  return {
    id: 'enr-1',
    studentId: 'stu-1',
    courseId: 'cou-1',
    enrolledAt: '2026-01-01T00:00:00.000Z',
    status: 'approved',
    requestedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function makeCertificate(over: Partial<Certificate> = {}): Certificate {
  return {
    id: 'cert-1',
    studentId: 'stu-1',
    courseId: 'cou-1',
    score: 85,
    issuedAt: '2026-06-01T00:00:00.000Z',
    ...over,
  }
}

function makeTrainee(over: Partial<TcuTrainee> = {}): TcuTrainee {
  return {
    id: 'tcu-1',
    firstName: 'V',
    lastName: 'W',
    email: 'v@w.co',
    sede: 'Linda Vista',
    university: 'Universidad de Costa Rica',
    courseId: 'cou-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function makeCtx(over: Partial<ScopeContext> = {}): ScopeContext {
  return {
    currentUserId: null,
    courses: [],
    enrollments: [],
    students: [],
    tcuTrainees: [],
    ...over,
  }
}

describe('ownCourseIds', () => {
  it('returns the ids of courses the user teaches, and nothing else', () => {
    const courses = [
      makeCourse({ id: 'cou-1', teacherId: 'tea-1' }),
      makeCourse({ id: 'cou-2', teacherId: 'tea-2' }),
      makeCourse({ id: 'cou-3', teacherId: 'tea-1' }),
    ]
    const owned = ownCourseIds(courses, 'tea-1')
    expect([...owned].sort()).toEqual(['cou-1', 'cou-3'])
    expect(owned.has('cou-2')).toBe(false)
  })

  it('returns an empty set when the user teaches nothing', () => {
    const courses = [makeCourse({ teacherId: 'tea-2' })]
    expect(ownCourseIds(courses, 'tea-1').size).toBe(0)
  })
})

describe('applyScope token short-circuits', () => {
  it("'all' returns the list unfiltered regardless of user", () => {
    const students = [makeStudent({ id: 'stu-1' }), makeStudent({ id: 'stu-2' })]
    expect(applyScope('students', 'all', students, makeCtx())).toBe(students)
  })

  it("'none' always returns empty", () => {
    const students = [makeStudent()]
    expect(applyScope('students', 'none', students, makeCtx({ currentUserId: 'stu-1' }))).toEqual(
      []
    )
  })

  it('returns empty when there is no current user and the token is narrowed', () => {
    const students = [makeStudent({ id: 'stu-1' })]
    expect(applyScope('students', 'self', students, makeCtx({ currentUserId: null }))).toEqual([])
  })
})

describe('courses browseable scope', () => {
  const student = makeStudent({ id: 'stu-1', sede: 'Linda Vista', educationalLevel: 'primaria' })

  it('keeps published, matching-sede, matching-level courses the student is not in', () => {
    const courses = [
      makeCourse({ id: 'open', status: 'published', sede: 'Linda Vista', level: 'primaria' }),
    ]
    const ctx = makeCtx({ currentUserId: 'stu-1', students: [student], courses })
    const scoped = applyScope('courses', 'browseable', courses, ctx)
    expect(scoped.map((c) => c.id)).toEqual(['open'])
  })

  it('keeps a Term-ended published course — view access is Term-agnostic (ADR-0042, issue #257)', () => {
    // The browseable scope is the detail view-access seam, not the enrollment
    // window: a Term-ended cohort stays viewable (its "Term ended" badge shows),
    // and the Browse *list* — not this scope — drops it via isOpenForEnrollment.
    const courses = [
      makeCourse({
        id: 'ended',
        status: 'published',
        sede: 'Linda Vista',
        level: 'primaria',
        term: { start: '2020-01-01', end: '2020-06-01' },
      }),
    ]
    const ctx = makeCtx({ currentUserId: 'stu-1', students: [student], courses })
    const scoped = applyScope('courses', 'browseable', courses, ctx)
    expect(scoped.map((c) => c.id)).toEqual(['ended'])
  })

  it('excludes draft courses', () => {
    const courses = [
      makeCourse({ id: 'draft', status: 'draft', sede: 'Linda Vista', level: 'primaria' }),
    ]
    const ctx = makeCtx({ currentUserId: 'stu-1', students: [student], courses })
    expect(applyScope('courses', 'browseable', courses, ctx)).toEqual([])
  })

  it('excludes courses at a different sede', () => {
    const courses = [
      makeCourse({ id: 'far', status: 'published', sede: 'Hatillo', level: 'primaria' }),
    ]
    const ctx = makeCtx({ currentUserId: 'stu-1', students: [student], courses })
    expect(applyScope('courses', 'browseable', courses, ctx)).toEqual([])
  })

  it('excludes courses with a non-matching level (ADR-0020)', () => {
    const courses = [
      makeCourse({ id: 'sec', status: 'published', sede: 'Linda Vista', level: 'secundaria' }),
    ]
    const ctx = makeCtx({ currentUserId: 'stu-1', students: [student], courses })
    expect(applyScope('courses', 'browseable', courses, ctx)).toEqual([])
  })

  it('excludes courses the student is already enrolled in or pending for (ADR-0016)', () => {
    const courses = [
      makeCourse({ id: 'approved', sede: 'Linda Vista', level: 'primaria' }),
      makeCourse({ id: 'pending', sede: 'Linda Vista', level: 'primaria' }),
      makeCourse({ id: 'withdrawn', sede: 'Linda Vista', level: 'primaria' }),
    ]
    const enrollments = [
      makeEnrollment({ courseId: 'approved', status: 'approved' }),
      makeEnrollment({ courseId: 'pending', status: 'pending' }),
      // Withdrawn does not exclude — the student may re-request it.
      makeEnrollment({ courseId: 'withdrawn', status: 'withdrawn' }),
    ]
    const ctx = makeCtx({ currentUserId: 'stu-1', students: [student], courses, enrollments })
    const scoped = applyScope('courses', 'browseable', courses, ctx)
    expect(scoped.map((c) => c.id)).toEqual(['withdrawn'])
  })

  it('returns empty when the current user is not a known student', () => {
    const courses = [makeCourse({ sede: 'Linda Vista', level: 'primaria' })]
    const ctx = makeCtx({ currentUserId: 'ghost', students: [student], courses })
    expect(applyScope('courses', 'browseable', courses, ctx)).toEqual([])
  })
})

describe('courses enrolled scope', () => {
  it('keeps only courses the current user has any enrollment record in', () => {
    const courses = [makeCourse({ id: 'in' }), makeCourse({ id: 'out' })]
    const enrollments = [makeEnrollment({ studentId: 'stu-1', courseId: 'in' })]
    const ctx = makeCtx({ currentUserId: 'stu-1', courses, enrollments })
    const scoped = applyScope('courses', 'enrolled', courses, ctx)
    expect(scoped.map((c) => c.id)).toEqual(['in'])
  })
})

describe('courses assigned scope (ADR-0036)', () => {
  it("returns exactly the self-trainee's Course, never another's", () => {
    const courses = [
      makeCourse({ id: 'mine' }),
      makeCourse({ id: 'theirs' }),
      makeCourse({ id: 'unrelated' }),
    ]
    const trainees = [
      makeTrainee({ id: 'tcu-1', courseId: 'mine' }),
      makeTrainee({ id: 'tcu-2', courseId: 'theirs' }),
    ]
    const ctx = makeCtx({ currentUserId: 'tcu-1', courses, tcuTrainees: trainees })
    const scoped = applyScope('courses', 'assigned', courses, ctx)
    expect(scoped.map((c) => c.id)).toEqual(['mine'])
  })

  it('returns [] for a userId with no trainee record', () => {
    const courses = [makeCourse({ id: 'mine' })]
    const trainees = [makeTrainee({ id: 'tcu-2', courseId: 'mine' })]
    const ctx = makeCtx({ currentUserId: 'ghost', courses, tcuTrainees: trainees })
    expect(applyScope('courses', 'assigned', courses, ctx)).toEqual([])
  })

  it('returns [] when the trainee record points at a Course not in the list', () => {
    const courses = [makeCourse({ id: 'present' })]
    const trainees = [makeTrainee({ id: 'tcu-1', courseId: 'gone' })]
    const ctx = makeCtx({ currentUserId: 'tcu-1', courses, tcuTrainees: trainees })
    expect(applyScope('courses', 'assigned', courses, ctx)).toEqual([])
  })
})

describe('student self/own scopes (#166)', () => {
  it("'self' narrows students to only the current student", () => {
    const students = [makeStudent({ id: 'stu-1' }), makeStudent({ id: 'stu-2' })]
    const scoped = applyScope('students', 'self', students, makeCtx({ currentUserId: 'stu-1' }))
    expect(scoped.map((s) => s.id)).toEqual(['stu-1'])
  })

  it("'own' narrows enrollments to only the current student's enrollments", () => {
    const enrollments = [
      makeEnrollment({ id: 'e1', studentId: 'stu-1' }),
      makeEnrollment({ id: 'e2', studentId: 'stu-2' }),
    ]
    const scoped = applyScope(
      'enrollments',
      'own',
      enrollments,
      makeCtx({ currentUserId: 'stu-1' })
    )
    expect(scoped.map((e) => e.id)).toEqual(['e1'])
  })
})

describe('teacher ownCourses scopes', () => {
  const courses = [
    makeCourse({ id: 'mine', teacherId: 'tea-1' }),
    makeCourse({ id: 'theirs', teacherId: 'tea-2' }),
  ]

  it('certificates narrow to those in courses the teacher owns (ADR-0019)', () => {
    const certificates = [
      makeCertificate({ id: 'c1', courseId: 'mine' }),
      makeCertificate({ id: 'c2', courseId: 'theirs' }),
    ]
    const ctx = makeCtx({ currentUserId: 'tea-1', courses })
    const scoped = applyScope('certificates', 'ownCourses', certificates, ctx)
    expect(scoped.map((c) => c.id)).toEqual(['c1'])
  })

  it('enrollments narrow to the rosters of courses the teacher owns', () => {
    const enrollments = [
      makeEnrollment({ id: 'e1', courseId: 'mine' }),
      makeEnrollment({ id: 'e2', courseId: 'theirs' }),
    ]
    const ctx = makeCtx({ currentUserId: 'tea-1', courses })
    const scoped = applyScope('enrollments', 'ownCourses', enrollments, ctx)
    expect(scoped.map((e) => e.id)).toEqual(['e1'])
  })

  it('students narrow to those enrolled in courses the teacher owns', () => {
    const enrollments = [
      makeEnrollment({ studentId: 'stu-1', courseId: 'mine' }),
      makeEnrollment({ studentId: 'stu-2', courseId: 'theirs' }),
    ]
    const students = [makeStudent({ id: 'stu-1' }), makeStudent({ id: 'stu-2' })]
    const ctx = makeCtx({ currentUserId: 'tea-1', courses, enrollments })
    const scoped = applyScope('students', 'enrolledInOwnCourses', students, ctx)
    expect(scoped.map((s) => s.id)).toEqual(['stu-1'])
  })
})
