import { describe, it, expect, beforeEach } from 'vitest'
import { announcementsApi } from '../api/announcements'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import type { Announcement, Course, Enrollment, Student, Teacher, TcuTrainee } from '@/types'

// Two Courses at the same Sede owned by different teachers; a Student enrolled in
// only the first. The feed read must honour the scope seam (ADR-0040): a viewer
// sees exactly the announcements of the Courses they can see.
const teacherA: Teacher = {
  id: 'tea-1',
  firstName: 'A',
  lastName: 'A',
  email: 'a@fundavida.es',
  sede: 'Linda Vista',
  province: 'San José',
  canton: 'Central',
  courseIds: ['cou-1'],
  createdAt: '2026-01-01T00:00:00Z',
}
const teacherB: Teacher = { ...teacherA, id: 'tea-2', courseIds: ['cou-2'] }

const courseA: Course = {
  id: 'cou-1',
  name: 'Course A',
  description: '',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 20,
  teacherId: 'tea-1',
  term: { start: '2026-02-02', end: '2026-05-13' },
  meetingDays: ['mon'],
  createdAt: '2026-01-01T00:00:00Z',
}
const courseB: Course = { ...courseA, id: 'cou-2', name: 'Course B', teacherId: 'tea-2' }

const student: Student = {
  id: 'stu-1',
  firstName: 'S',
  lastName: 'S',
  email: 's@fundavida.es',
  gender: 'F',
  sede: 'Linda Vista',
  province: 'San José',
  canton: 'Central',
  educationalLevel: 'primaria',
  guardian: { name: 'G', relationship: 'madre', phone: '', email: '' },
  enrolledCourseIds: ['cou-1'],
  createdAt: '2026-01-01T00:00:00Z',
}

const enrollment: Enrollment = {
  id: 'enr-1',
  studentId: 'stu-1',
  courseId: 'cou-1',
  enrolledAt: '2026-02-02T00:00:00Z',
  status: 'approved',
  requestedAt: '2026-02-02T00:00:00Z',
}

// A TCU volunteer assigned to Course B: their 'assigned' scope must show only
// cou-2's feed (ADR-0036/0040).
const trainee: TcuTrainee = {
  id: 'tcu-1',
  firstName: 'V',
  lastName: 'V',
  email: 'v@fundavida.es',
  sede: 'Linda Vista',
  university: 'Universidad de Costa Rica',
  courseId: 'cou-2',
  createdAt: '2026-01-01T00:00:00Z',
}

const annA: Announcement = {
  id: 'ann-1',
  courseId: 'cou-1',
  body: 'A-old',
  kind: 'manual',
  createdAt: '2026-03-01T00:00:00Z',
}
const annA2: Announcement = {
  id: 'ann-2',
  courseId: 'cou-1',
  body: 'A-new',
  kind: 'manual',
  createdAt: '2026-03-05T00:00:00Z',
}
const annB: Announcement = {
  id: 'ann-3',
  courseId: 'cou-2',
  body: 'B-only',
  kind: 'manual',
  createdAt: '2026-03-02T00:00:00Z',
}

function seedControlled() {
  useStore.setState({
    courses: [courseA, courseB],
    teachers: [teacherA, teacherB],
    students: [student],
    enrollments: [enrollment],
    tcuTrainees: [trainee],
    announcements: [annA, annA2, annB],
  })
}

describe('announcementsApi (scope seam, ADR-0040)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    seedControlled()
  })

  it('admin sees every Course feed', async () => {
    useStore.setState({ role: 'admin', currentUserId: 'admin' })
    const ids = (await announcementsApi.list()).map((a) => a.id)
    expect(ids.sort()).toEqual(['ann-1', 'ann-2', 'ann-3'])
  })

  it('teacher sees only their own Course feed', async () => {
    useStore.setState({ role: 'teacher', currentUserId: 'tea-1' })
    const ids = (await announcementsApi.list()).map((a) => a.id)
    expect(ids.sort()).toEqual(['ann-1', 'ann-2'])
    expect(ids).not.toContain('ann-3')
  })

  it('student sees only enrolled Course feeds — never another Course', async () => {
    useStore.setState({ role: 'student', currentUserId: 'stu-1' })
    const ids = (await announcementsApi.list()).map((a) => a.id)
    expect(ids.sort()).toEqual(['ann-1', 'ann-2'])
    // The unenrolled Course B feed is invisible.
    expect(ids).not.toContain('ann-3')
  })

  it('tcu volunteer sees only their assigned Course feed', async () => {
    useStore.setState({ role: 'tcu', currentUserId: 'tcu-1' })
    const ids = (await announcementsApi.list()).map((a) => a.id)
    // Assigned to cou-2 → sees ann-3 only, never the cou-1 feed.
    expect(ids).toEqual(['ann-3'])
  })

  it('returns newest-first', async () => {
    useStore.setState({ role: 'admin', currentUserId: 'admin' })
    const list = await announcementsApi.list()
    const dates = list.map((a) => a.createdAt)
    expect(dates).toEqual([...dates].sort((x, y) => y.localeCompare(x)))
  })

  it('filters by courseId', async () => {
    useStore.setState({ role: 'admin', currentUserId: 'admin' })
    const list = await announcementsApi.list({ courseId: 'cou-2' })
    expect(list.map((a) => a.id)).toEqual(['ann-3'])
  })
})
