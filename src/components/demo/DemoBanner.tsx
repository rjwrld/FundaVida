import { useState } from 'react'
import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { clock } from '@/lib/clock'
import { useFormat } from '@/hooks/useFormat'

// A dismissed-banner flag is a UI preference, not seed-snapshot data, so it is
// intentionally not versioned with the snapshot — a reseed must not un-dismiss it.
const DISMISS_KEY = 'fundavida:v1:banner-dismissed'

// Read straight from localStorage at mount: this is a client-only SPA (no SSR),
// so there is no hydration mismatch and no banner↔badge flash on first paint.
function readDismissed(): boolean {
  return window.localStorage.getItem(DISMISS_KEY) === '1'
}

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(readDismissed)
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const frozenDate = formatDate(clock.today().toISOString())

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  function restore() {
    window.localStorage.removeItem(DISMISS_KEY)
    setDismissed(false)
  }

  // Dismissed → collapse to a small, persistent badge that re-expands on click.
  if (dismissed) {
    return (
      <div className="flex justify-end bg-primary/10 px-4 py-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={restore}
          className="h-auto gap-1.5 px-2 py-0.5 text-xs text-muted-foreground"
        >
          <Info className="size-3" />
          {t('demoBanner.badge')}
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-primary/10 text-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-2">
        <p>{t('demoBanner.message', { date: frozenDate })}</p>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          {t('demoBanner.dismiss')}
        </Button>
      </div>
    </div>
  )
}
