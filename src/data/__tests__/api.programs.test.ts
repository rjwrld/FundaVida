import { describe, it, expect, beforeEach } from 'vitest'
import type { Role } from '@/types'
import { programsApi } from '../api/programs'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('programsApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  const roles: Role[] = ['admin', 'teacher', 'student', 'tcu']

  // The Program catalog is org-wide and read-only (ADR-0015): every role sees the
  // whole catalog through the scope seam, never a raw store read.
  roles.forEach((role) => {
    it(`returns the whole catalog for ${role}`, async () => {
      useStore.getState().setRole(role)
      const expected = useStore.getState().programs
      const result = await programsApi.list()
      expect(result.map((p) => p.id).sort()).toEqual(expected.map((p) => p.id).sort())
      expect(result.length).toBeGreaterThan(0)
    })

    it(`resolves a single program by id for ${role}`, async () => {
      useStore.getState().setRole(role)
      const first = useStore.getState().programs[0]
      if (!first) throw new Error('expected a seeded program')
      const result = await programsApi.get(first.id)
      expect(result?.id).toBe(first.id)
    })
  })

  it('returns null for an unknown program id', async () => {
    useStore.getState().setRole('admin')
    expect(await programsApi.get('prog-does-not-exist')).toBeNull()
  })
})
