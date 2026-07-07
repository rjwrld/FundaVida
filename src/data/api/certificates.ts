import type { Certificate } from '@/types'
import { scopedList } from './scopedRead'

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
  list(filters: CertificateFilters = {}): Promise<Certificate[]> {
    return scopedList('certificates', filters, applyFilters)
  },
}
