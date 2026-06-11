import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { useStore } from '@/data/store'
import {
  clearPersistedState,
  clearPersistedRole,
  clearPersistedCurrentUser,
} from '@/data/persistence'

describe('wireAuditInvalidation', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('invalidates auditLog cache when auditLog slice changes', async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    // Import after QueryClient is set up so we can spy on it
    const { wireAuditInvalidation } = await import('../auditInvalidation')
    const unsubscribe = wireAuditInvalidation(queryClient)

    // Trigger a state change that modifies auditLog
    useStore.getState().createStudent({
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@example.com',
      gender: 'M',
      province: 'San José',
      canton: 'Central',
      educationalLevel: 'Secondary',
    })

    // Wait a tick for subscription to fire
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auditLog'] })

    unsubscribe()
  })

  it('does not invalidate auditLog cache for non-audit state changes', async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { wireAuditInvalidation } = await import('../auditInvalidation')
    const unsubscribe = wireAuditInvalidation(queryClient)

    // Trigger a state change that does NOT modify auditLog
    useStore.getState().setLocale('es')

    // Wait a tick for subscription to fire
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['auditLog'] })

    unsubscribe()
  })

  it('stops invalidating after unsubscribe', async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { wireAuditInvalidation } = await import('../auditInvalidation')
    const unsubscribe = wireAuditInvalidation(queryClient)

    // First mutation
    useStore.getState().createStudent({
      firstName: 'Test',
      lastName: 'Student',
      email: 'test@example.com',
      gender: 'M',
      province: 'San José',
      canton: 'Central',
      educationalLevel: 'Secondary',
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['auditLog'] })

    // Reset spy
    invalidateSpy.mockClear()

    // Unsubscribe
    unsubscribe()

    // Second mutation should not trigger invalidation
    useStore.getState().createStudent({
      firstName: 'Another',
      lastName: 'Student',
      email: 'another@example.com',
      gender: 'F',
      province: 'San José',
      canton: 'Central',
      educationalLevel: 'Secondary',
    })

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
