import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface CoursesEmptyProps {
  onAdd?: () => void
  className?: string
}

export function CoursesEmpty({ onAdd, className }: CoursesEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/courses.svg" alt="" className="w-60" />}
      heading={t('courses.empty.heading')}
      body={t('courses.empty.body')}
      action={onAdd ? { label: t('courses.empty.cta'), onClick: onAdd } : undefined}
    />
  )
}
