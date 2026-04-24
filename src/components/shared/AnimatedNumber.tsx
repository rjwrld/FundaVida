import * as React from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface AnimatedNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number
  duration?: number
  format?: (value: number) => string
}

const defaultFormat = (n: number) => n.toLocaleString('en-US')

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function AnimatedNumber({
  value,
  duration = 800,
  format = defaultFormat,
  className,
  ...props
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion()
  const [display, setDisplay] = React.useState(value)
  const prev = React.useRef(value)
  const rafRef = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value)
      prev.current = value
      return
    }

    const from = prev.current
    const to = value
    prev.current = value

    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      setDisplay(from + (to - from) * easeOutCubic(t))
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration, prefersReducedMotion])

  return (
    <span className={cn('tabular-nums', className)} {...props}>
      {format(display)}
    </span>
  )
}
