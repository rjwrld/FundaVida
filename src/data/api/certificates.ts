import type { Certificate } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

export interface CertificateFilters {
  studentId?: string
  courseId?: string
}

function applyFilters(certificates: Certificate[], filters: CertificateFilters): Certificate[] {
  return certificates.filter((c) => {
    if (filters.studentId && c.studentId !== filters.studentId) return false
    if (filters.courseId && c.courseId !== filters.courseId) return false
    return true
  })
}

export const certificatesApi = {
  async list(filters: CertificateFilters = {}): Promise<Certificate[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const scope = scopeFor(role)['certificates']
    const scoped = applyScope('certificates', scope, state.certificates)
    return applyFilters(scoped, filters)
  },
}
