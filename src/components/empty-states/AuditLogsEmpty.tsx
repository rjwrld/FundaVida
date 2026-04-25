import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface AuditLogsEmptyProps {
  className?: string
}

export function AuditLogsEmpty({ className }: AuditLogsEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/audit-logs.svg" alt="" className="w-60" />}
      heading={t('auditLog.emptyState.heading')}
      body={t('auditLog.emptyState.body')}
    />
  )
}
