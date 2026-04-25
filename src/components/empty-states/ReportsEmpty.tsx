import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface ReportsEmptyProps {
  className?: string
}

export function ReportsEmpty({ className }: ReportsEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/reports.svg" alt="" className="w-full" />}
      heading={t('reports.empty.heading')}
      body={t('reports.empty.body')}
    />
  )
}
