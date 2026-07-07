import type { AuditLogEntry, AuditAction, AuditEntity } from '@/types'
import { scopedList } from './scopedRead'

export interface AuditLogFilters {
  action?: AuditAction
  entity?: AuditEntity
}

function applyFilters(entries: AuditLogEntry[], filters: AuditLogFilters): AuditLogEntry[] {
  return entries.filter((e) => {
    if (filters.action && e.action !== filters.action) return false
    if (filters.entity && e.entity !== filters.entity) return false
    return true
  })
}

export const auditLogApi = {
  list(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    return scopedList('auditLog', filters, applyFilters)
  },
}
