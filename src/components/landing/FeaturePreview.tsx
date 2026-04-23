import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LANDING_FEATURES } from '@/constants/landingFeatures'

export function FeaturePreview() {
  const { t } = useTranslation()

  return (
    <section aria-labelledby="feature-preview-heading" className="space-y-6">
      <h2
        id="feature-preview-heading"
        className="text-center text-2xl font-semibold tracking-tight"
      >
        {t('landing.featurePreview.heading')}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {LANDING_FEATURES.map((feature) => (
          <Card key={feature.titleKey} className="overflow-hidden">
            <div className="aspect-[16/10] overflow-hidden bg-muted">
              <img
                src={feature.image}
                alt={t(feature.altKey)}
                width={800}
                height={500}
                loading="lazy"
                decoding="async"
                className="block h-full w-full object-cover"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-base">{t(feature.titleKey)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t(feature.captionKey)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
