import { useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useFormat } from '@/hooks/useFormat'

/**
 * Counts up to `value` once it scrolls half into view. Under reduced motion it
 * shows the final number straight away; numbers format in the app's locale
 * (not the browser's), matching every other figure on the page.
 */
export function NumberTicker({
  value,
  duration = 1500,
  format,
  className,
}: {
  value: number
  duration?: number
  format?: (n: number) => string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const reduce = useReducedMotion()
  const { formatNumber } = useFormat()
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView || reduce) return
    const start = performance.now()
    let frame: number
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      setDisplay(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [inView, reduce, value, duration])

  const shown = reduce ? value : display
  return (
    <span ref={ref} className={className}>
      {format ? format(shown) : formatNumber(shown)}
    </span>
  )
}
