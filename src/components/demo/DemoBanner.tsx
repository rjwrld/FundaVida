import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'fundavida:v1:banner-dismissed'

export function DemoBanner() {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    setVisible(window.localStorage.getItem(DISMISS_KEY) !== '1')
  }, [])

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-primary/10 text-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-2">
        <p>{t('demoBanner.message')}</p>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          {t('demoBanner.dismiss')}
        </Button>
      </div>
    </div>
  )
}
