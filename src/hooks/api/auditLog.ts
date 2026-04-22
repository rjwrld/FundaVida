import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { AuditLogFilters } from '@/data/api/auditLog'

const AUDIT_LOG_KEY = ['auditLog'] as const

export function useAuditLog(filters: AuditLogFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...AUDIT_LOG_KEY, role, filters],
    queryFn: () => api.auditLog.list(filters),
  })
}
