import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { drawOn, transitionDefaults } from '@/lib/motion'

/**
 * The green highlighter smear behind a key word (ADR-0049). Draws on left to
 * right (scaleX) once mounted; the skew and blobby radius keep it hand-made
 * rather than a neat box. The ink sits above the smear — real highlighter
 * goes under the word, so the text wrapper re-establishes paint order.
 */
export function HighlighterSmear({
  children,
  delay = 0,
}: {
  /** Optional only so <Trans components> can pass the element childless — the word arrives at render. */
  children?: ReactNode
  delay?: number
}) {
  const reduce = useReducedMotion()

  return (
    <span className="relative whitespace-nowrap">
      <motion.span
        aria-hidden
        className="absolute -inset-x-[0.16em] -bottom-[0.02em] top-[0.12em] bg-[color-mix(in_oklab,var(--brand-green-400)_30%,transparent)]"
        style={{
          borderRadius: '0.18em 0.3em 0.22em 0.35em / 0.5em 0.28em 0.45em 0.3em',
          skewX: -6,
          originX: 0,
        }}
        variants={reduce ? undefined : drawOn}
        initial={reduce ? false : 'hidden'}
        animate="visible"
        transition={{ ...transitionDefaults, duration: 0.7, delay }}
      />
      <span className="relative">{children}</span>
    </span>
  )
}
