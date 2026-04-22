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
    expect(list.length).toBeGreaterThan(0)
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

  it('admin can get any course by id', async () => {
    useStore.getState().setRole('admin')
    const all = useStore.getState().courses
    const first = all[0]
    if (!first) throw new Error('no courses in seed')
    const result = await api.courses.get(first.id)
    expect(result?.id).toBe(first.id)
  })

  it('teacher cannot get a course they do not teach', async () => {
    useStore.getState().setRole('teacher')
    const foreign = useStore.getState().courses.find((c) => c.teacherId !== 'tea-1')
    if (!foreign) throw new Error('seed is missing a course owned by another teacher')
    const result = await api.courses.get(foreign.id)
    expect(result).toBeNull()
  })

  it('teacher can get a course they teach', async () => {
    useStore.getState().setRole('teacher')
    const own = useStore.getState().courses.find((c) => c.teacherId === 'tea-1')
    if (!own) throw new Error('seed is missing a course owned by tea-1')
    const result = await api.courses.get(own.id)
    expect(result?.id).toBe(own.id)
  })

  it('student cannot get a course they are not enrolled in', async () => {
    useStore.getState().setRole('student')
    const state = useStore.getState()
    const enrolledIds = new Set(
      state.enrollments.filter((e) => e.studentId === 'stu-1').map((e) => e.courseId)
    )
    const foreign = state.courses.find((c) => !enrolledIds.has(c.id))
    if (!foreign) throw new Error('seed is missing a course not enrolled by stu-1')
    const result = await api.courses.get(foreign.id)
    expect(result).toBeNull()
  })

  it('student can get a course they are enrolled in', async () => {
    useStore.getState().setRole('student')
    const state = useStore.getState()
    const enrollment = state.enrollments.find((e) => e.studentId === 'stu-1')
    if (!enrollment) throw new Error('seed is missing an enrollment for stu-1')
    const result = await api.courses.get(enrollment.courseId)
    expect(result?.id).toBe(enrollment.courseId)
  })
})
