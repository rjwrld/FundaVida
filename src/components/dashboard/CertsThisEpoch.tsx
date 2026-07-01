import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Award, ArrowRight } from 'lucide-react'
import { AnimatedNumber } from '@/components/shared/AnimatedNumber'
import { useCertificates } from '@/hooks/api/certificates'

/**
 * Certificates issued this Demo Epoch. Under the close-emits model (ADR-0024)
 * every Certificate is already downloadable — there is no pending state — so
 * this is a straight count of the role-scoped {@link useCertificates} list, not
 * a review queue. Links to the certificates gallery.
 */
export function CertsThisEpoch() {
  const { t } = useTranslation()
  const { data: certificates = [] } = useCertificates()

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">
          {t('dashboard.certsThisEpoch.title')}
        </h3>
        <Award className="size-4 shrink-0 text-brand-green-700" aria-hidden="true" />
      </header>
      <div className="flex flex-1 flex-col justify-center">
        <AnimatedNumber
          value={certificates.length}
          className="font-display text-4xl font-semibold text-foreground"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.certsThisEpoch.subtitle')}
        </p>
      </div>
      <Link
        to="/app/certificates"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-green-700 hover:underline"
      >
        {t('dashboard.certsThisEpoch.viewAll')}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  )
}
