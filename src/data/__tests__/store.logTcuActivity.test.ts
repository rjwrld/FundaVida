import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('store.logTcuActivity', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('allows tcu role to log an activity for their trainee', () => {
    useStore.getState().setRole('tcu')
    const before = useStore.getState().tcuActivities.length

    const activity = useStore.getState().logTcuActivity({
      traineeId: 'tcu-1',
      title: 'Community service event',
      hours: 5,
      date: new Date().toISOString(),
    })

    const after = useStore.getState().tcuActivities.length
    expect(after).toBe(before + 1)
    expect(activity.traineeId).toBe('tcu-1')
    expect(activity.title).toBe('Community service event')
    expect(activity.hours).toBe(5)
  })

  it('allows admin to log activities for any trainee', () => {
    useStore.getState().setRole('admin')
    const traineeId = 'tcu-2'

    const activity = useStore.getState().logTcuActivity({
      traineeId,
      title: 'Admin-logged activity',
      hours: 3,
      date: new Date().toISOString(),
    })

    expect(activity.traineeId).toBe(traineeId)
  })

  it('denies student role from logging activities', () => {
    useStore.getState().setRole('student')

    expect(() => {
      useStore.getState().logTcuActivity({
        traineeId: 'stu-1',
        title: 'Student activity',
        hours: 2,
        date: new Date().toISOString(),
      })
    }).toThrow('permission denied: student cannot log tcu')
  })

  it('denies teacher role from logging activities', () => {
    useStore.getState().setRole('teacher')

    expect(() => {
      useStore.getState().logTcuActivity({
        traineeId: 'tea-1',
        title: 'Teacher activity',
        hours: 2,
        date: new Date().toISOString(),
      })
    }).toThrow('permission denied: teacher cannot log tcu')
  })

  it('creates an audit log entry for logged activities', () => {
    useStore.getState().setRole('tcu')
    const auditLogBefore = useStore.getState().auditLog.length

    useStore.getState().logTcuActivity({
      traineeId: 'tcu-1',
      title: 'Test activity',
      hours: 4,
      date: new Date().toISOString(),
    })

    const auditLogAfter = useStore.getState().auditLog.length
    expect(auditLogAfter).toBe(auditLogBefore + 1)

    const lastEntry = useStore.getState().auditLog[0]
    expect(lastEntry).toMatchObject({
      action: 'log',
      entity: 'tcuActivity',
      summary: expect.stringContaining('Test activity'),
    })
  })
})
