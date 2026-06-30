import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '../api'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('api.students', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('admin sees all students', async () => {
    useStore.getState().setRole('admin')
    const list = await api.students.list()
    expect(list.length).toBe(useStore.getState().students.length)
  })

  it('student sees only their own record via the self scope (#166)', async () => {
    useStore.getState().setRole('student')
    const { currentUserId } = useStore.getState()
    const list = await api.students.list()
    expect(list).toHaveLength(1)
    expect(list[0]?.id).toBe(currentUserId)
  })

  it('get returns the matching student by id', async () => {
    useStore.getState().setRole('admin')
    const first = useStore.getState().students[0]
    if (!first) throw new Error('expected at least one student in the seed')
    const found = await api.students.get(first.id)
    expect(found?.id).toBe(first.id)
  })

  it('get returns null for an unknown id', async () => {
    useStore.getState().setRole('admin')
    const found = await api.students.get('stu-does-not-exist')
    expect(found).toBeNull()
  })

  it('list applies the search filter on name or email', async () => {
    useStore.getState().setRole('admin')
    const all = await api.students.list()
    const first = all[0]
    if (!first) throw new Error('no students in seed')
    const targeted = await api.students.list({ search: first.firstName })
    expect(targeted.some((s) => s.id === first.id)).toBe(true)
  })

  it('list applies sede filter', async () => {
    useStore.getState().setRole('admin')
    const result = await api.students.list({ sede: 'Linda Vista' })
    expect(result.every((s) => s.sede === 'Linda Vista')).toBe(true)
  })

  it('teacher sees ONLY students enrolled in their courses', async () => {
    useStore.getState().setRole('teacher')
    const state = useStore.getState()
    // tea-1 should see only students enrolled in their courses
    const teacherCourseIds = new Set(
      state.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    const enrolledStudentIds = new Set(
      state.enrollments.filter((e) => teacherCourseIds.has(e.courseId)).map((e) => e.studentId)
    )
    const list = await api.students.list()
    expect(list.length).toBe(enrolledStudentIds.size)
    expect(list.every((s) => enrolledStudentIds.has(s.id))).toBe(true)
  })
})
