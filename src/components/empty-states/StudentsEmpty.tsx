import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface StudentsEmptyProps {
  onAdd?: () => void
  className?: string
}

export function StudentsEmpty({ onAdd, className }: StudentsEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/students.svg" alt="" className="w-full" />}
      heading={t('students.empty.heading')}
      body={t('students.empty.body')}
      action={onAdd ? { label: t('students.empty.cta'), onClick: onAdd } : undefined}
    />
  )
}
