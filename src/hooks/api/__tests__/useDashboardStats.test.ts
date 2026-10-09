import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDashboardStats } from '../useDashboardStats'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

/**
 * Grade an approved student in a published course with a passing score, then close
 * the course — emitting that student's (and any other passing roster member's)
 * Certificate. Returns how many Certificates the close emitted.
 */
function closePublishedCourseEmittingCert(): number {
  const { courses, enrollments } = useStore.getState()
  for (const course of courses.filter((c) => c.status === 'published')) {
    const approved = enrollments.find((e) => e.courseId === course.id && e.status === 'approved')
    if (!approved) continue
    useStore.getState().setGrade(approved.studentId, course.id, 95)
    const before = useStore.getState().certificates.length
    useStore.getState().closeCourse(course.id)
    return useStore.getState().certificates.length - before
  }
  throw new Error('seed has no published course with an approved enrollment')
}

describe('useDashboardStats — certificate-backed counts (ADR-0024)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('counts every Certificate as issued', () => {
    const { result } = renderHook(() => useDashboardStats())
    const total = useStore.getState().certificates.length
    expect(total).toBeGreaterThan(0)
    expect(result.current.certsIssued).toBe(total)
  })

  it('reflects a fresh course close: issued rises by the emitted count', () => {
    const before = renderHook(() => useDashboardStats()).result.current
    const emitted = closePublishedCourseEmittingCert()
    expect(emitted).toBeGreaterThan(0)

    const after = renderHook(() => useDashboardStats()).result.current
    expect(after.certsIssued).toBe(before.certsIssued + emitted)
  })
})
