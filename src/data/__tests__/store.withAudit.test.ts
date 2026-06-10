import { describe, it, expect, beforeEach } from 'vitest'
import { useStore, withAudit, type AuditDescriptor } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('withAudit seam', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    // Clear audit log and currentUserId to start fresh
    useStore.setState({ auditLog: [], currentUserId: null })
  })

  it('routes a synthetic mutation through the seam with zero per-mutation wiring', () => {
    const store = useStore.getState()
    const initialLength = store.auditLog.length

    // Use withAudit with useStore.setState as the set function
    withAudit(useStore.setState, () => ({
      next: { role: 'admin' },
      audit: {
        action: 'create',
        entity: 'student',
        entityId: 'test-id',
        summary: 'Test action summary',
      },
    }))

    const updated = useStore.getState()
    expect(updated.auditLog.length).toBe(initialLength + 1)
  })

  it('seam-injected audit entry has descriptor fields plus id, timestamp, and actorId', () => {
    const descriptor: AuditDescriptor = {
      action: 'create',
      entity: 'course',
      entityId: 'test-123',
      summary: 'Test summary',
    }

    withAudit(useStore.setState, () => ({
      next: {},
      audit: descriptor,
    }))

    const updated = useStore.getState()
    const entry = updated.auditLog[0]

    expect(entry?.action).toBe('create')
    expect(entry?.entity).toBe('course')
    expect(entry?.entityId).toBe('test-123')
    expect(entry?.summary).toBe('Test summary')
    expect(entry?.id).toMatch(/^log-\d+$/)
    const parsed = new Date(entry?.timestamp ?? '')
    expect(!isNaN(parsed.getTime())).toBe(true)
    if (entry?.timestamp) {
      expect(entry.timestamp).toBe(parsed.toISOString())
    }
  })

  it('audit entry actorId comes from currentUserId when set', () => {
    useStore.setState({ currentUserId: 'user-123' })

    withAudit(useStore.setState, () => ({
      next: {},
      audit: {
        action: 'create',
        entity: 'student',
        entityId: 'test-id',
        summary: 'Test',
      },
    }))

    const updated = useStore.getState()
    expect(updated.auditLog[0]?.actorId).toBe('user-123')
  })

  it('audit entry actorId is "system" when currentUserId is null', () => {
    useStore.setState({ currentUserId: null })

    withAudit(useStore.setState, () => ({
      next: {},
      audit: {
        action: 'create',
        entity: 'student',
        entityId: 'test-id',
        summary: 'Test',
      },
    }))

    const updated = useStore.getState()
    expect(updated.auditLog[0]?.actorId).toBe('system')
  })

  it('audit entry actorId is "system" when currentUserId is undefined', () => {
    useStore.setState({ currentUserId: undefined as never })

    withAudit(useStore.setState, () => ({
      next: {},
      audit: {
        action: 'create',
        entity: 'student',
        entityId: 'test-id',
        summary: 'Test',
      },
    }))

    const updated = useStore.getState()
    expect(updated.auditLog[0]?.actorId).toBe('system')
  })

  it('audit entry is prepended (newest first)', () => {
    const store = useStore.getState()
    const previousHead = store.auditLog[0]

    withAudit(useStore.setState, () => ({
      next: {},
      audit: {
        action: 'create',
        entity: 'student',
        entityId: 'test-id',
        summary: 'New entry',
      },
    }))

    const updated = useStore.getState()
    const newEntry = updated.auditLog[0]

    expect(newEntry?.summary).toBe('New entry')
    expect(updated.auditLog[1]).toBe(previousHead)
  })
})
