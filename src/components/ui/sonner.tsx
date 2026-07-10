import type * as React from 'react'
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useReducedMotion } from 'framer-motion'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { useTheme } from '@/hooks/useTheme'
import { transitionFast } from '@/lib/motion'

const Toaster = ({ ...props }: ToasterProps) => {
  // ADR-0047: the registry reads the theme from `next-themes`; this app owns its own
  // `useTheme` (class on <html>, localStorage-backed), so that seam is swapped.
  const { theme } = useTheme()
  const prefersReducedMotion = useReducedMotion()

  // ADR-0047 local extension. Sonner owns the toast enter/exit transition; we only
  // feed its duration from the shared motion token so toasts share the app's motion
  // vocabulary, and collapse it to zero under prefers-reduced-motion so it degrades
  // to none (ADR-0027). The CSS var is consumed by the `[data-sonner-toast]` rule in
  // index.css.
  const transitionDuration = prefersReducedMotion ? '0s' : `${transitionFast.duration}s`

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        style: { '--fv-toast-duration': transitionDuration } as React.CSSProperties,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
