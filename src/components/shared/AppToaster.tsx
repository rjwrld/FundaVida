import type * as React from 'react'
import { Toaster } from 'sonner'
import { useReducedMotion } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'
import { transitionFast } from '@/lib/motion'

export function AppToaster() {
  const { theme } = useTheme()
  const prefersReducedMotion = useReducedMotion()

  // Sonner owns the toast enter/exit transition; we only feed its duration from
  // the shared motion token so toasts share the app's motion vocabulary, and
  // collapse it to zero under prefers-reduced-motion so it degrades to none
  // (ADR-0027). The CSS var is consumed by the `[data-sonner-toast]` rule in
  // index.css.
  const transitionDuration = prefersReducedMotion ? '0s' : `${transitionFast.duration}s`

  return (
    <Toaster
      theme={theme}
      toastOptions={{
        style: { '--fv-toast-duration': transitionDuration } as React.CSSProperties,
      }}
    />
  )
}
