import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface GradesEmptyProps {
  className?: string
}

export function GradesEmpty({ className }: GradesEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/grades.svg" alt="" className="w-full" />}
      heading={t('grades.empty.heading')}
      body={t('grades.empty.body')}
    />
  )
}
