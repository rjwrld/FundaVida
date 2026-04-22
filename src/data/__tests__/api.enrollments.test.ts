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

  it('returns empty for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await enrollmentsApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await enrollmentsApi.list()).toEqual([])
  })

  it('filters by studentId', async () => {
    useStore.getState().setRole('admin')
    const result = await enrollmentsApi.list({ studentId: 'stu-1' })
    expect(result.every((e) => e.studentId === 'stu-1')).toBe(true)
  })

  it('filters by courseId', async () => {
    useStore.getState().setRole('admin')
    const result = await enrollmentsApi.list({ courseId: 'cou-1' })
    expect(result.every((e) => e.courseId === 'cou-1')).toBe(true)
  })
})
