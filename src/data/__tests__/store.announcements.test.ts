import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'
import { setDemoEpoch } from '@/lib/clock'
import type { Announcement, Course, Teacher } from '@/types'

const teacher: Teacher = {
  id: 'tea-1',
  firstName: 'Tea',
  lastName: 'One',
  email: 't1@fundavida.es',
  sede: 'Linda Vista',
  province: 'San José',
  canton: 'Central',
  courseIds: ['cou-1'],
  createdAt: '2026-01-01T00:00:00Z',
}

const course: Course = {
  id: 'cou-1',
  name: 'Math 101',
  description: 'Calculus',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 20,
  teacherId: 'tea-1',
  term: { start: '2026-02-02', end: '2026-05-13' },
  meetingDays: ['mon', 'wed', 'fri'],
  createdAt: '2026-01-01T00:00:00Z',
}

function seedControlled(over: { announcements?: Announcement[] } = {}) {
  setDemoEpoch(new Date('2026-03-04').toISOString(), 0)
  useStore.setState({
    courses: [course],
    teachers: [teacher],
    announcements: over.announcements ?? [],
    auditLog: [],
    role: 'admin',
    currentUserId: 'admin',
  })
}

describe('createAnnouncement', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    seedControlled()
  })

  it('posts a manual announcement to the course feed', () => {
    const ann = useStore
      .getState()
      .createAnnouncement({ courseId: 'cou-1', body: 'Bring your book' })
    const state = useStore.getState()
    expect(state.announcements).toContainEqual(ann)
    expect(ann.id).toMatch(/^ann-\d+$/)
    expect(ann.kind).toBe('manual')
    expect(ann.body).toBe('Bring your book')
    expect(ann.courseId).toBe('cou-1')
  })

  it('records an `announcement` audit entry', () => {
    useStore.getState().createAnnouncement({ courseId: 'cou-1', body: 'Hello class' })
    const entry = useStore.getState().auditLog[0]
    expect(entry?.entity).toBe('announcement')
    expect(entry?.action).toBe('create')
  })

  it('trims the body and rejects an empty one', () => {
    const ann = useStore.getState().createAnnouncement({ courseId: 'cou-1', body: '  spaced  ' })
    expect(ann.body).toBe('spaced')
    expect(() =>
      useStore.getState().createAnnouncement({ courseId: 'cou-1', body: '   ' })
    ).toThrow()
  })

  it('rejects an unknown course', () => {
    expect(() => useStore.getState().createAnnouncement({ courseId: 'nope', body: 'x' })).toThrow()
  })

  it('rejects posting to a closed course (terminal)', () => {
    useStore.setState({ courses: [{ ...course, status: 'closed' }] })
    expect(() => useStore.getState().createAnnouncement({ courseId: 'cou-1', body: 'x' })).toThrow(
      /closed/i
    )
  })

  describe('permissions (ADR-0009 throw-on-violation)', () => {
    it('lets the owning teacher post to their own course', () => {
      useStore.setState({ role: 'teacher', currentUserId: 'tea-1' })
      expect(() =>
        useStore.getState().createAnnouncement({ courseId: 'cou-1', body: 'note' })
      ).not.toThrow()
    })

    it('rejects a teacher who does not own the course', () => {
      useStore.setState({ role: 'teacher', currentUserId: 'tea-2' })
      expect(() =>
        useStore.getState().createAnnouncement({ courseId: 'cou-1', body: 'note' })
      ).toThrow(/permission/i)
    })

    it('rejects a student (a student can never post, ADR-0040)', () => {
      useStore.setState({ role: 'student', currentUserId: 'stu-1' })
      expect(() =>
        useStore.getState().createAnnouncement({ courseId: 'cou-1', body: 'note' })
      ).toThrow(/permission/i)
    })
  })
})

describe('deleteAnnouncement', () => {
  const seeded: Announcement = {
    id: 'ann-1',
    courseId: 'cou-1',
    body: 'Existing',
    kind: 'manual',
    createdAt: '2026-03-01T00:00:00Z',
  }

  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    seedControlled({ announcements: [seeded] })
  })

  it('removes the post and audits the delete', () => {
    useStore.getState().deleteAnnouncement('ann-1')
    expect(useStore.getState().announcements).toHaveLength(0)
    expect(useStore.getState().auditLog[0]?.entity).toBe('announcement')
    expect(useStore.getState().auditLog[0]?.action).toBe('delete')
  })

  it('is a no-op for an unknown id', () => {
    useStore.getState().deleteAnnouncement('ghost')
    expect(useStore.getState().announcements).toHaveLength(1)
  })

  it('rejects a student', () => {
    useStore.setState({ role: 'student', currentUserId: 'stu-1' })
    expect(() => useStore.getState().deleteAnnouncement('ann-1')).toThrow(/permission/i)
  })

  it('rejects a teacher who does not own the course', () => {
    useStore.setState({ role: 'teacher', currentUserId: 'tea-2' })
    expect(() => useStore.getState().deleteAnnouncement('ann-1')).toThrow(/permission/i)
  })
})
