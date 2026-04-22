import type { AuditLogEntry, AuditAction, AuditEntity } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface AuditLogFilters {
  action?: AuditAction
  entity?: AuditEntity
}

function applyRoleFilter(entries: AuditLogEntry[]): AuditLogEntry[] {
  const role = useStore.getState().role
  if (role === 'admin') return entries
  return []
}

function applyFilters(entries: AuditLogEntry[], filters: AuditLogFilters): AuditLogEntry[] {
  return entries.filter((e) => {
    if (filters.action && e.action !== filters.action) return false
    if (filters.entity && e.entity !== filters.entity) return false
    return true
  })
}

export const auditLogApi = {
  async list(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().auditLog), filters)
  },
}
