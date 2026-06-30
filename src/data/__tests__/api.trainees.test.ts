import { describe, it, expect, beforeEach } from 'vitest'
import { traineesApi } from '../api/trainees'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('traineesApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all trainees for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await traineesApi.list()
    expect(result.length).toBeGreaterThan(1)
  })

  it('returns only the trainee themselves for tcu role (tcu-1)', async () => {
    useStore.getState().setRole('tcu')
    const result = await traineesApi.list()
    // A TCU volunteer must not see other volunteers in the roster (scope seam, ADR-0008).
    expect(result.map((t) => t.id)).toEqual(['tcu-1'])
  })

  it('returns empty for student role', async () => {
    useStore.getState().setRole('student')
    expect(await traineesApi.list()).toEqual([])
  })

  it('returns only trainees assigned to the teacher’s own courses', async () => {
    useStore.getState().setRole('teacher') // persona tea-1
    const s = useStore.getState()
    const ownCourseIds = new Set(
      s.courses.filter((c) => c.teacherId === s.currentUserId).map((c) => c.id)
    )
    const expected = s.tcuTrainees
      .filter((t) => ownCourseIds.has(t.courseId))
      .map((t) => t.id)
      .sort()
    // The seed assigns volunteers to some of tea-1's courses, so this is non-trivial.
    expect(expected.length).toBeGreaterThan(0)

    const result = await traineesApi.list()
    expect(result.map((t) => t.id).sort()).toEqual(expected)
    // A volunteer assigned to another teacher's course is never leaked (ADR-0011/0017).
    expect(result.every((t) => ownCourseIds.has(t.courseId))).toBe(true)
  })
})
