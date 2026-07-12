import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Award, ArrowRight } from 'lucide-react'
import { AnimatedNumber } from '@/components/shared/AnimatedNumber'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle as="h3">{t('dashboard.certsThisEpoch.title')}</CardTitle>
        <CardAction>
          <Award className="size-4 text-primary" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center">
        <AnimatedNumber
          value={certificates.length}
          className="font-display text-4xl font-semibold text-foreground"
        />
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.certsThisEpoch.subtitle')}
        </p>
      </CardContent>
      <CardFooter>
        <Link
          to="/app/certificates"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('dashboard.certsThisEpoch.viewAll')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}
