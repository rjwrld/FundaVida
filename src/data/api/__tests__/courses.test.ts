import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../../store'
import { coursesApi } from '../courses'
import {
  clearPersistedState,
  clearPersistedRole,
  clearPersistedCurrentUser,
} from '../../persistence'

describe('coursesApi.seatsRemaining (#166)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    // A Student browsing an open Course is the caller: the seat count is an
    // aggregate the data layer computes, never a roster the Student can read.
    useStore.getState().setRole('student')
  })

  it('returns capacity minus the count of approved enrollments', async () => {
    const { courses, enrollments } = useStore.getState()
    // A Course that actually has approved enrollments, so the count narrows.
    const course = courses.find(
      (c) => enrollments.filter((e) => e.courseId === c.id && e.status === 'approved').length > 0
    )
    if (!course) throw new Error('seed: no course with approved enrollments')
    const approved = enrollments.filter(
      (e) => e.courseId === course.id && e.status === 'approved'
    ).length

    const seats = await coursesApi.seatsRemaining(course.id)

    expect(seats).toBe(course.capacity - approved)
    expect(seats).toBeLessThan(course.capacity)
  })

  it('only counts approved enrollments, not pending/rejected/withdrawn', async () => {
    const { courses } = useStore.getState()
    const course = courses[0]
    if (!course) throw new Error('seed: no courses')

    // Seed a non-approved enrollment; it must not consume a seat.
    const before = await coursesApi.seatsRemaining(course.id)
    useStore.setState((s) => ({
      enrollments: [
        ...s.enrollments,
        {
          id: 'enr-seat-test',
          studentId: 'stu-1',
          courseId: course.id,
          enrolledAt: new Date().toISOString(),
          status: 'pending' as const,
          requestedAt: new Date().toISOString(),
        },
      ],
    }))
    const after = await coursesApi.seatsRemaining(course.id)

    expect(after).toBe(before)
  })

  it('never returns a negative number and yields 0 for an unknown course', async () => {
    expect(await coursesApi.seatsRemaining('does-not-exist')).toBe(0)
  })
})
