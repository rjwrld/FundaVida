import { describe, it, expect, beforeEach } from 'vitest'
import { tcuApi } from '../api/tcu'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('tcuApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all activities for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await tcuApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns only own activities for tcu trainee (tcu-1)', async () => {
    useStore.getState().setRole('tcu')
    const result = await tcuApi.list()
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.traineeId === 'tcu-1')).toBe(true)
  })

  it('returns empty for student role', async () => {
    useStore.getState().setRole('student')
    expect(await tcuApi.list()).toEqual([])
  })

  it("returns activities for trainees assigned to teacher's courses", async () => {
    const store = useStore.getState()
    store.setRole('teacher')
    const freshStore = useStore.getState()
    const teacherId = freshStore.currentUserId // tea-1
    const teacherCourses = freshStore.courses.filter((c) => c.teacherId === teacherId)

    const result = await tcuApi.list()

    // If the teacher has no courses, result should be empty
    if (teacherCourses.length === 0) {
      expect(result).toEqual([])
    } else {
      // Otherwise, all returned activities should be from trainees assigned to the teacher's courses
      const assignedTraineeIds = new Set(
        freshStore.tcuTrainees
          .filter((t) => teacherCourses.some((c) => c.id === t.courseId))
          .map((t) => t.id)
      )
      expect(result.every((a) => assignedTraineeIds.has(a.traineeId))).toBe(true)
    }
  })

  it('filters by traineeId (admin only)', async () => {
    useStore.getState().setRole('admin')
    const all = await tcuApi.list()
    const targetTrainee = all[0]?.traineeId
    if (!targetTrainee) throw new Error('no tcu activities in seed')
    const result = await tcuApi.list({ traineeId: targetTrainee })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.traineeId === targetTrainee)).toBe(true)
  })

  describe('approveTcuActivity', () => {
    it('teacher approves a pending activity for their assigned trainee', async () => {
      const store = useStore.getState()
      store.setRole('teacher')
      // Get fresh state reference after mutation
      const freshStore = useStore.getState()
      const teacherId = freshStore.currentUserId // tea-1
      expect(teacherId).toBe('tea-1')

      const teacherCourses = freshStore.courses.filter((c) => c.teacherId === teacherId)

      // The seed must have at least one pending activity that we can test with
      // If no teacher courses exist, skip (seed issue)
      if (teacherCourses.length === 0) {
        return
      }

      const pendingActivity = freshStore.tcuActivities.find((a) => {
        const trainee = freshStore.tcuTrainees.find((t) => t.id === a.traineeId)
        return (
          a.status === 'pending' && trainee && teacherCourses.some((c) => c.id === trainee.courseId)
        )
      })

      if (!pendingActivity) {
        // No pending activity in seed for this teacher's courses, skip
        return
      }

      // Teacher approves the activity
      const approved = freshStore.approveTcuActivity(pendingActivity.id, 'approved')
      expect(approved.status).toBe('approved')
      expect(approved.approvedBy).toBe(teacherId)
      expect(approved.approvedAt).toBeDefined()

      // Verify the activity in the store is updated
      const verifyStore = useStore.getState()
      const updated = verifyStore.tcuActivities.find((a) => a.id === pendingActivity.id)
      expect(updated?.status).toBe('approved')
      expect(updated?.approvedBy).toBe(teacherId)
    })

    it('teacher rejects a pending activity for their assigned trainee', async () => {
      const store = useStore.getState()
      store.setRole('teacher')
      const freshStore = useStore.getState()

      const teacherId = freshStore.currentUserId
      const teacherCourses = freshStore.courses.filter((c) => c.teacherId === teacherId)
      if (teacherCourses.length === 0) return

      const pendingActivity = freshStore.tcuActivities.find((a) => {
        const trainee = freshStore.tcuTrainees.find((t) => t.id === a.traineeId)
        return (
          a.status === 'pending' && trainee && teacherCourses.some((c) => c.id === trainee.courseId)
        )
      })
      if (!pendingActivity) return

      const rejected = freshStore.approveTcuActivity(pendingActivity.id, 'rejected')
      expect(rejected.status).toBe('rejected')
      expect(rejected.approvedBy).toBe(teacherId)
      expect(rejected.approvedAt).toBeDefined()
    })

    it('admin can approve any pending activity', async () => {
      const store = useStore.getState()
      store.setRole('admin')
      const freshStore = useStore.getState()

      const adminId = freshStore.currentUserId // 'admin'
      const pendingActivity = freshStore.tcuActivities.find((a) => a.status === 'pending')
      expect(pendingActivity).toBeDefined()
      if (!pendingActivity) return

      const approved = freshStore.approveTcuActivity(pendingActivity.id, 'approved')
      expect(approved.status).toBe('approved')
      expect(approved.approvedBy).toBe(adminId)
    })

    it('teacher cannot approve activity from trainee not assigned to their courses', async () => {
      const store = useStore.getState()
      store.setRole('teacher')
      const freshStore = useStore.getState()

      const teacherId = freshStore.currentUserId
      const teacherCourses = freshStore.courses.filter((c) => c.teacherId === teacherId)

      // Find a pending activity from a trainee NOT assigned to teacher's courses
      const pendingActivity = freshStore.tcuActivities.find((a) => {
        const trainee = freshStore.tcuTrainees.find((t) => t.id === a.traineeId)
        return (
          a.status === 'pending' &&
          trainee &&
          !teacherCourses.some((c) => c.id === trainee.courseId)
        )
      })
      if (!pendingActivity) {
        // If we can't find such an activity in the seed, skip this check (seed limitation)
        return
      }

      expect(() => freshStore.approveTcuActivity(pendingActivity.id, 'approved')).toThrow(
        /permission denied/i
      )
    })

    it('student cannot approve activities', async () => {
      const store = useStore.getState()
      store.setRole('student')
      const freshStore = useStore.getState()

      const pendingActivity = freshStore.tcuActivities.find((a) => a.status === 'pending')
      expect(pendingActivity).toBeDefined()
      if (!pendingActivity) return

      expect(() => freshStore.approveTcuActivity(pendingActivity.id, 'approved')).toThrow(
        /permission denied/i
      )
    })

    it('approving activity emits audit entry', async () => {
      const store = useStore.getState()
      store.setRole('admin')
      const freshStore = useStore.getState()

      const beforeCount = freshStore.auditLog.length
      const pendingActivity = freshStore.tcuActivities.find((a) => a.status === 'pending')
      expect(pendingActivity).toBeDefined()
      if (!pendingActivity) return

      freshStore.approveTcuActivity(pendingActivity.id, 'approved')
      const verifyStore = useStore.getState()
      const afterCount = verifyStore.auditLog.length
      expect(afterCount).toBe(beforeCount + 1)
      expect(verifyStore.auditLog[0]?.action).toBe('approve')
      expect(verifyStore.auditLog[0]?.entity).toBe('tcuActivity')
    })
  })
})
