import { describe, it, expect, beforeEach } from 'vitest'
import { gradesApi } from '../api/grades'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('gradesApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all grades for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await gradesApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('teacher sees grades from their own courses', async () => {
    useStore.getState().setRole('teacher')
    const state = useStore.getState()
    const ownCourseIds = new Set(
      state.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    const result = await gradesApi.list()
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((g) => ownCourseIds.has(g.courseId))).toBe(true)
  })

  it('student sees only their own grades', async () => {
    useStore.getState().setRole('student')
    const result = await gradesApi.list()
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((g) => g.studentId === 'stu-1')).toBe(true)
  })

  it('tcu sees empty grades', async () => {
    useStore.getState().setRole('tcu')
    expect(await gradesApi.list()).toEqual([])
  })

  it('filters by studentId', async () => {
    useStore.getState().setRole('admin')
    const all = await gradesApi.list()
    const target = all[0]?.studentId
    if (!target) throw new Error('expected a seeded grade to derive studentId from')
    const result = await gradesApi.list({ studentId: target })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((g) => g.studentId === target)).toBe(true)
  })

  it('filters by courseId', async () => {
    useStore.getState().setRole('admin')
    const all = await gradesApi.list()
    const target = all[0]?.courseId
    if (!target) throw new Error('expected a seeded grade to derive courseId from')
    const result = await gradesApi.list({ courseId: target })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((g) => g.courseId === target)).toBe(true)
  })
})
