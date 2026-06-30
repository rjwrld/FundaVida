import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { CertificateFilters } from '@/data/api/certificates'

export const CERTIFICATES_KEY = ['certificates'] as const

// Role is part of the queryKey so the scoped list (admin sees all, a Student
// sees only their own — ADR-0012) refetches when the role switches.
export function useCertificates(filters: CertificateFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...CERTIFICATES_KEY, role, filters],
    queryFn: () => api.certificates.list(filters),
  })
}
