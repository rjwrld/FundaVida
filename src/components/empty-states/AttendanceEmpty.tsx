import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface AttendanceEmptyProps {
  className?: string
}

export function AttendanceEmpty({ className }: AttendanceEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/attendance.svg" alt="" className="w-full" />}
      heading={t('attendance.empty.heading')}
      body={t('attendance.empty.body')}
    />
  )
}
