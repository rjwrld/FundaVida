import type { Program } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

// The Program catalog read (ADR-0015). Like every other list/detail, it goes
// through the scope seam (ADR-0008) rather than reading the store raw: the
// 'programs' token is 'all' for every role, so the catalog is org-wide.
export const programsApi = {
  async list(): Promise<Program[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const scope = scopeFor(role)['programs']
    return applyScope('programs', scope, state.programs)
  },
  async get(id: string): Promise<Program | null> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const scope = scopeFor(role)['programs']
    const scoped = applyScope('programs', scope, state.programs)
    return scoped.find((p) => p.id === id) ?? null
  },
}
