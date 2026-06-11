import type { AuditLogEntry, AuditAction, AuditEntity } from '@/types'
import { scopeFor } from '@/permissions'
import { useStore } from '../store'
import { applyScope } from './scope'
import { delay } from './_delay'

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
  async list(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    await delay()
    const state = useStore.getState()
    const role = state.role ?? 'student'
    const auditLog = state.auditLog
    const scope = scopeFor(role)['auditLog']
    const scoped = applyScope('auditLog', scope, auditLog)
    return applyFilters(scoped, filters)
  },
}
