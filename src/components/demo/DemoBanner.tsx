import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'fundavida:v1:banner-dismissed'

export function DemoBanner() {
  const [visible, setVisible] = useState(false)

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
        <p>
          <strong>Demo mode.</strong> All data lives in your browser. Clear site data to start
          fresh.
        </p>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
