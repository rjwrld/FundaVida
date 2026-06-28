import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useDemoBanner } from './useDemoBanner'

// The collapsed demo notice: a compact info button that lives inside the header
// once the banner is dismissed. Clicking it re-opens the full banner. Rendering
// it in the header (instead of a standalone strip) keeps the top nav clean.
export function DemoBadge() {
  const { dismissed, restore } = useDemoBanner()
  const { t } = useTranslation()

  if (!dismissed) return null

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={restore}
      aria-label={t('demoBanner.badge')}
      title={t('demoBanner.badge')}
    >
      <Info className="size-4" />
    </Button>
  )
}
