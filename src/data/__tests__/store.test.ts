import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('useStore', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('seeds students, teachers, courses, enrollments, and grades', () => {
    const s = useStore.getState()
    expect(s.students.length).toBeGreaterThan(0)
    expect(s.teachers.length).toBeGreaterThan(0)
    expect(s.courses.length).toBeGreaterThan(0)
    expect(s.enrollments.length).toBeGreaterThan(0)
    expect(s.grades.length).toBeGreaterThan(0)
  })

  it('setRole persists and updates state', () => {
    useStore.getState().setRole('admin')
    expect(useStore.getState().role).toBe('admin')
    expect(window.localStorage.getItem('fundavida:v1:role')).toBe('admin')
  })

  it('resetDemo clears role and reseeds data', () => {
    useStore.getState().setRole('teacher')
    useStore.getState().resetDemo()
    expect(useStore.getState().role).toBeNull()
    expect(useStore.getState().students.length).toBeGreaterThan(0)
  })

  it('resetDemo clears the persisted role key so a reload does not rehydrate it', () => {
    useStore.getState().setRole('teacher')
    expect(window.localStorage.getItem('fundavida:v1:role')).toBe('teacher')
    useStore.getState().resetDemo()
    expect(window.localStorage.getItem('fundavida:v1:role')).toBeNull()
  })

  it('resetDemo clears the banner-dismissed flag so the banner reappears', () => {
    window.localStorage.setItem('fundavida:v1:banner-dismissed', '1')
    useStore.getState().resetDemo()
    expect(window.localStorage.getItem('fundavida:v1:banner-dismissed')).toBeNull()
  })
})

describe('teacher CRUD', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('creates a teacher with id and empty courseIds', () => {
    const created = useStore.getState().createTeacher({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@fv.cr',
    })
    expect(created.id).toMatch(/^tea-\d+$/)
    expect(created.courseIds).toEqual([])
    expect(useStore.getState().teachers.some((t) => t.id === created.id)).toBe(true)
  })

  it('updates a teacher patch', () => {
    const { id } = useStore.getState().createTeacher({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
    })
    useStore.getState().updateTeacher(id, { lastName: 'Changed' })
    expect(useStore.getState().teachers.find((t) => t.id === id)?.lastName).toBe('Changed')
  })

  it('refuses to delete a teacher with assigned courses', () => {
    const tea1 = useStore.getState().teachers.find((t) => t.courseIds.length > 0)
    if (!tea1) throw new Error('no teacher with courses in seed')
    expect(() => useStore.getState().deleteTeacher(tea1.id)).toThrow(/reassign/i)
    expect(useStore.getState().teachers.some((t) => t.id === tea1.id)).toBe(true)
  })

  it('deletes a teacher with no assigned courses', () => {
    const created = useStore.getState().createTeacher({
      firstName: 'Lone',
      lastName: 'Wolf',
      email: 'lone@fv.cr',
    })
    useStore.getState().deleteTeacher(created.id)
    expect(useStore.getState().teachers.some((t) => t.id === created.id)).toBe(false)
  })
})

describe('grade admin actions', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('updateGradeScore refreshes score and issuedAt', () => {
    const first = useStore.getState().grades[0]
    if (!first) throw new Error('expected at least one seeded grade')
    const originalIssuedAt = first.issuedAt
    useStore.getState().updateGradeScore(first.id, 88)
    const after = useStore.getState().grades.find((g) => g.id === first.id)
    if (!after) throw new Error('expected updated grade to exist')
    expect(after.score).toBe(88)
    expect(after.issuedAt).not.toBe(originalIssuedAt)
  })

  it('deleteGrade removes only the target grade', () => {
    const first = useStore.getState().grades[0]
    if (!first) throw new Error('expected at least one seeded grade')
    const before = useStore.getState().grades.length
    useStore.getState().deleteGrade(first.id)
    expect(useStore.getState().grades.length).toBe(before - 1)
    expect(useStore.getState().grades.some((g) => g.id === first.id)).toBe(false)
  })
})
