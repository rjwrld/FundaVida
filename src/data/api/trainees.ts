import type { TcuTrainee } from '@/types'
import { scopedList } from './scopedRead'

// The trainee roster rides the tcu visibility scope (ADR-0013 pattern): admin sees
// all, a TCU volunteer sees only themselves. That deviation (token 'tcu', slice
// 'tcuTrainees') is declared in the RESOURCE_READ registry, not re-expressed here.
export const traineesApi = {
  list(): Promise<TcuTrainee[]> {
    return scopedList('trainees', {})
  },
}
