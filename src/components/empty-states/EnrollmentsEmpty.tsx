import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface EnrollmentsEmptyProps {
  className?: string
}

export function EnrollmentsEmpty({ className }: EnrollmentsEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/enrollments.svg" alt="" className="w-full" />}
      heading={t('enrollments.empty.heading')}
      body={t('enrollments.empty.body')}
    />
  )
}
