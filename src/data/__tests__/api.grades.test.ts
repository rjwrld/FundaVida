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

  it('returns empty for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await gradesApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await gradesApi.list()).toEqual([])
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

  it('get returns null for non-admin roles', async () => {
    useStore.getState().setRole('admin')
    const first = (await gradesApi.list())[0]
    if (!first) throw new Error('expected a seeded grade')
    useStore.getState().setRole('teacher')
    expect(await gradesApi.get(first.id)).toBeNull()
    useStore.getState().setRole('student')
    expect(await gradesApi.get(first.id)).toBeNull()
  })

  it('get returns the grade for admin', async () => {
    useStore.getState().setRole('admin')
    const first = (await gradesApi.list())[0]
    if (!first) throw new Error('expected a seeded grade')
    expect(await gradesApi.get(first.id)).not.toBeNull()
  })
})
