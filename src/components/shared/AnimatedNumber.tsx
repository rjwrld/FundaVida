import * as React from 'react'
import { useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface AnimatedNumberProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number
  duration?: number
  format?: (value: number) => string
}

const defaultFormat = (n: number) => n.toLocaleString('en-US')

/** Decimal places the target value carries (0 for an integer count). */
function decimalsOf(n: number): number {
  if (Number.isInteger(n)) return 0
  const text = String(n)
  const exp = text.match(/e-(\d+)$/)
  if (exp) return Number(exp[1])
  return text.split('.')[1]?.length ?? 0
}

/**
 * Round a tween frame to the target's own precision, so an integer count never
 * shows "35.613" mid-tween and a 12.5 target never shows 7.31 — whatever
 * `format` the caller passes.
 */
function roundTo(n: number, decimals: number): number {
  const factor = 10 ** decimals
  return Math.round(n * factor) / factor
}

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
    const decimals = decimalsOf(to)
    prev.current = value

    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      setDisplay(roundTo(from + (to - from) * easeOutCubic(t), decimals))
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
