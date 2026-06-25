import type { TcuTrainee } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export const traineesApi = {
  async list(): Promise<TcuTrainee[]> {
    await delay()
    const state = useStore.getState()
    return state.tcuTrainees
  },
}
