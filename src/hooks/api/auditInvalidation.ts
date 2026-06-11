import { QueryClient } from '@tanstack/react-query'
import { useStore } from '@/data/store'
import { AUDIT_LOG_KEY } from './auditLog'

export function wireAuditInvalidation(queryClient: QueryClient): () => void {
  let prevAuditLog = useStore.getState().auditLog

  return useStore.subscribe((state) => {
    if (state.auditLog !== prevAuditLog) {
      prevAuditLog = state.auditLog
      queryClient.invalidateQueries({ queryKey: AUDIT_LOG_KEY })
    }
  })
}
