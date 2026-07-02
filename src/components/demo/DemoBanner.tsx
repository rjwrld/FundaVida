import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { clock } from '@/lib/clock'
import { useFormat } from '@/hooks/useFormat'
import { useDemoBanner } from './useDemoBanner'

// The first-visit demo notice: a full-width strip above the header. Once
// dismissed it collapses into the header chip (see DemoBadge), so here it simply
// renders nothing — no leftover empty strip above the nav.
export function DemoBanner() {
  const { dismissed, dismiss } = useDemoBanner()
  const { t } = useTranslation()
  const { formatDate } = useFormat()

  if (dismissed) return null

  const frozenDate = formatDate(clock.today().toISOString())

  return (
    <div role="region" aria-label={t('demoBanner.label')} className="bg-primary/10 text-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-2">
        <p>{t('demoBanner.message', { date: frozenDate })}</p>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          {t('demoBanner.dismiss')}
        </Button>
      </div>
    </div>
  )
}
