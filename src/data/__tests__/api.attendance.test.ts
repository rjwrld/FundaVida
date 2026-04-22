import { describe, it, expect, beforeEach } from 'vitest'
import { attendanceApi } from '../api/attendance'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('attendanceApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all records for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await attendanceApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns only own records for student (stu-1)', async () => {
    useStore.getState().setRole('student')
    const result = await attendanceApi.list()
    expect(result.every((r) => r.studentId === 'stu-1')).toBe(true)
  })

  it('returns only records for teacher-owned courses (tea-1)', async () => {
    useStore.getState().setRole('teacher')
    const result = await attendanceApi.list()
    const state = useStore.getState()
    const ownedCourseIds = new Set(
      state.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    expect(result.every((r) => ownedCourseIds.has(r.courseId))).toBe(true)
  })

  it('returns empty for tcu role', async () => {
    useStore.getState().setRole('tcu')
    expect(await attendanceApi.list()).toEqual([])
  })

  it('filters by courseId (admin)', async () => {
    useStore.getState().setRole('admin')
    const all = await attendanceApi.list()
    const targetCourse = all[0]?.courseId
    if (!targetCourse) throw new Error('no attendance records in seed')
    const result = await attendanceApi.list({ courseId: targetCourse })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.courseId === targetCourse)).toBe(true)
  })

  it('filters by status (admin)', async () => {
    useStore.getState().setRole('admin')
    const result = await attendanceApi.list({ status: 'present' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.status === 'present')).toBe(true)
  })
})
