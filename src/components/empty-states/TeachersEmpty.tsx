import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface TeachersEmptyProps {
  onAdd?: () => void
  className?: string
}

export function TeachersEmpty({ onAdd, className }: TeachersEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/teachers.svg" alt="" className="w-60" />}
      heading={t('teachers.empty.heading')}
      body={t('teachers.empty.body')}
      action={onAdd ? { label: t('teachers.empty.cta'), onClick: onAdd } : undefined}
    />
  )
}
