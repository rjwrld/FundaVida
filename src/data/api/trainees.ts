import type { TcuTrainee } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export const traineesApi = {
  async list(): Promise<TcuTrainee[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    // The trainee roster rides the tcu visibility scope (ADR-0013 pattern): admin
    // sees all, a TCU volunteer sees only themselves — never a raw, unscoped store read.
    const scope = scopeFor(role)['tcu']
    return applyScope('trainees', scope, state.tcuTrainees)
  },
}
