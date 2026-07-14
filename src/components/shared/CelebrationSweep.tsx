import { motion, useReducedMotion } from 'framer-motion'
import { transitionSweep } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * A single decorative green-tinted sheen that sweeps once across its parent —
 * the shared "this just happened" highlight of the phase-6b celebrations
 * (ADR-0047): certificate shimmer, enrollment-approval row sweep, checklist
 * cascade rows. The parent must be `relative` with `overflow-hidden`. Mount it
 * only for the celebrated element; the caller owns clearing its trigger state
 * on its own clock (a fixed timer, not this animation's completion — a row
 * can unmount mid-sweep and a completion callback would never come). Renders
 * null under reduced motion.
 */
export function CelebrationSweep({ delay = 0, className }: { delay?: number; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <motion.span
      aria-hidden="true"
      data-testid="celebration-sweep"
      className={cn(
        'pointer-events-none absolute inset-0 bg-linear-to-r from-transparent via-primary/15 to-transparent',
        className
      )}
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ ...transitionSweep, delay }}
    />
  )
}
