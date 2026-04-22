import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '../api'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('api.courses role filter', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('admin sees all courses', async () => {
    useStore.getState().setRole('admin')
    const list = await api.courses.list()
    expect(list.length).toBe(useStore.getState().courses.length)
  })

  it('teacher sees only their own', async () => {
    useStore.getState().setRole('teacher')
    const list = await api.courses.list()
    expect(list.every((c) => c.teacherId === 'tea-1')).toBe(true)
  })

  it('student sees only enrolled courses', async () => {
    useStore.getState().setRole('student')
    const list = await api.courses.list()
    const enrolledIds = useStore
      .getState()
      .enrollments.filter((e) => e.studentId === 'stu-1')
      .map((e) => e.courseId)
    expect(list.every((c) => enrolledIds.includes(c.id))).toBe(true)
  })

  it('list applies search filter', async () => {
    useStore.getState().setRole('admin')
    const all = await api.courses.list()
    const first = all[0]
    if (!first) throw new Error('no courses in seed')
    const results = await api.courses.list({ search: first.name })
    expect(results.some((c) => c.id === first.id)).toBe(true)
  })
})
