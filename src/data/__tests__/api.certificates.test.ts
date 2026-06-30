import { describe, it, expect, beforeEach } from 'vitest'
import { certificatesApi } from '../api/certificates'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('certificatesApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all certificates for admin, each downloadable (ADR-0024)', async () => {
    useStore.getState().setRole('admin')
    const result = await certificatesApi.list()
    expect(result.length).toBeGreaterThan(0)
    // No pending/approved status — every Certificate exists already downloadable,
    // carrying its emit instant as issuedAt.
    expect(result.every((c) => typeof c.issuedAt === 'string')).toBe(true)
  })

  it('a student sees only their own certificates (ADR-0012)', async () => {
    useStore.getState().setRole('student')
    const result = await certificatesApi.list()
    expect(result.every((c) => c.studentId === 'stu-1')).toBe(true)
  })

  it('a teacher sees only certificates in their own courses', async () => {
    useStore.getState().setRole('teacher')
    const { currentUserId, courses } = useStore.getState()
    const ownCourseIds = new Set(
      courses.filter((c) => c.teacherId === currentUserId).map((c) => c.id)
    )

    const result = await certificatesApi.list()

    expect(result.length).toBeGreaterThan(0)
    expect(result.every((c) => ownCourseIds.has(c.courseId))).toBe(true)
  })

  it('a tcu trainee sees no certificates', async () => {
    useStore.getState().setRole('tcu')
    expect(await certificatesApi.list()).toEqual([])
  })

  it('filters by courseId', async () => {
    useStore.getState().setRole('admin')
    const all = await certificatesApi.list()
    const courseId = all[0]?.courseId
    expect(courseId).toBeTruthy()
    const filtered = await certificatesApi.list({ courseId })
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every((c) => c.courseId === courseId)).toBe(true)
  })
})
