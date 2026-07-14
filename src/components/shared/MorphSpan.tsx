import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { transitionDefaults } from '@/lib/motion'
import { cn } from '@/lib/utils'

export interface MorphSpanProps {
  /** Shared by exactly one source node and one target node — see `lib/courseMorph.ts`. */
  layoutId: string
  children: ReactNode
  className?: string
}

/**
 * One end of a shared-element morph: framer glides this box to wherever the
 * identically-id'd node on the next screen lands (ADR-0047 phase 6c), on the
 * shared motion token (ADR-0027). Both ends render through here so the contract —
 * the `layoutId`, the tight `inline-block` box that keeps the scale honest, and
 * the `data-morph-id` mirror that makes an otherwise DOM-invisible `layoutId`
 * assertable — is defined once rather than restated at each end.
 *
 * Callers arm the pairing; a lone node with no partner simply renders.
 */
export function MorphSpan({ layoutId, children, className }: MorphSpanProps) {
  return (
    <motion.span
      layoutId={layoutId}
      data-morph-id={layoutId}
      className={cn('inline-block', className)}
      transition={transitionDefaults}
    >
      {children}
    </motion.span>
  )
}
