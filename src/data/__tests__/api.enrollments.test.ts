import { describe, it, expect, beforeEach } from 'vitest'
import { enrollmentsApi } from '../api/enrollments'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('enrollmentsApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all enrollments for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await enrollmentsApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns only own-course enrollments for a teacher', async () => {
    useStore.getState().setRole('teacher')
    const result = await enrollmentsApi.list()
    const state = useStore.getState()
    const ownCourseIds = new Set(
      state.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => ownCourseIds.has(e.courseId))).toBe(true)
  })

  it('returns empty for a student', async () => {
    useStore.getState().setRole('student')
    expect(await enrollmentsApi.list()).toEqual([])
  })

  it('filters by studentId', async () => {
    useStore.getState().setRole('admin')
    const all = await enrollmentsApi.list()
    const targetStudent = all[0]?.studentId
    if (!targetStudent) throw new Error('no enrollments in seed')
    const result = await enrollmentsApi.list({ studentId: targetStudent })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.studentId === targetStudent)).toBe(true)
  })

  it('filters by courseId', async () => {
    useStore.getState().setRole('admin')
    const all = await enrollmentsApi.list()
    const targetCourse = all[0]?.courseId
    if (!targetCourse) throw new Error('no enrollments in seed')
    const result = await enrollmentsApi.list({ courseId: targetCourse })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.courseId === targetCourse)).toBe(true)
  })
})
