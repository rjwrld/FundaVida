import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/components/shared/EmptyState'

interface CertificatesEmptyProps {
  onAdd?: () => void
  className?: string
}

export function CertificatesEmpty({ onAdd, className }: CertificatesEmptyProps) {
  const { t } = useTranslation()
  return (
    <EmptyState
      className={className}
      illustration={<img src="/illustrations/certificates.svg" alt="" className="w-full" />}
      heading={t('certificates.empty.heading')}
      body={t('certificates.empty.body')}
      action={onAdd ? { label: t('certificates.empty.cta'), onClick: onAdd } : undefined}
    />
  )
}
