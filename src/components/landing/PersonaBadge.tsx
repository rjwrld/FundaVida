import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import type { Role } from '@/types'
import { badgeDealIn, transitionDefaults } from '@/lib/motion'
import { initials } from './initials'

export interface PersonaBadgeProps {
  role: Role
  roleLabel: string
  name: string
  desc: string
  /** Resting rotation (deg) — each badge sits slightly askew, like a dealt card. */
  tilt: number
  /** Entry rotation (deg) the deal-in settles from. */
  tiltIn: number
  delay: number
  onEnter: (role: Role) => void
}

/**
 * An ID-badge-styled role entry (ADR-0049): punch hole, initials avatar,
 * persona name, two lines of capability. A real button — clicking it signs
 * the visitor in as the role via the caller's onEnter. Deals in with a
 * rotation settle and straightens + lifts on hover; under reduced motion it
 * renders static at its resting tilt.
 */
export function PersonaBadge({
  role,
  roleLabel,
  name,
  desc,
  tilt,
  tiltIn,
  delay,
  onEnter,
}: PersonaBadgeProps) {
  const reduce = useReducedMotion()

  return (
    <motion.button
      type="button"
      onClick={() => onEnter(role)}
      variants={reduce ? undefined : badgeDealIn(tiltIn, tilt)}
      initial={reduce ? undefined : 'hidden'}
      animate={reduce ? undefined : 'visible'}
      whileHover={reduce ? undefined : { rotate: 0, y: -6 }}
      whileFocus={reduce ? undefined : { rotate: 0, y: -6 }}
      transition={{ ...transitionDefaults, duration: 0.7, delay }}
      style={reduce ? { rotate: tilt } : undefined}
      className="group relative block w-full rounded-xl border bg-card p-4 pt-10 text-left shadow-sm transition-shadow hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary"
    >
      <span
        aria-hidden
        className="absolute left-1/2 top-3 h-2 w-8 -translate-x-1/2 rounded-full bg-background shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)]"
      />
      <span className="flex items-center justify-between font-mono text-[0.66rem] font-medium uppercase tracking-[0.16em] text-primary">
        {roleLabel}
        <ArrowRight
          aria-hidden
          size={12}
          className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </span>
      <span className="mt-2.5 flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 font-display text-xs font-extrabold text-primary"
        >
          {initials(name)}
        </span>
        <span className="text-sm font-semibold leading-tight">{name}</span>
      </span>
      <span className="mt-2.5 block text-xs leading-relaxed text-muted-foreground">{desc}</span>
    </motion.button>
  )
}
