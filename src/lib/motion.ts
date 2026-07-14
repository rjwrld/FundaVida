import type { TargetAndTransition, Transition, Variants } from 'framer-motion'

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

/**
 * `fadeUp`'s hidden state as a standalone target — hand this to `exit` on a child
 * that inherits its `initial`/`animate` from a parent (e.g. a `staggerContainer`).
 * Passing the `"hidden"` label instead would classify the child as
 * variant-controlling, which severs that inheritance — and the stagger with it.
 * An object target does not.
 */
export const fadeUpHidden: TargetAndTransition = { opacity: 0, y: 8 }

export const fadeUp: Variants = {
  hidden: fadeUpHidden,
  visible: { opacity: 1, y: 0 },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

export const transitionDefaults: Transition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
}

export const transitionFast: Transition = {
  duration: 0.2,
  ease: 'easeOut',
}

/**
 * The glide shared by the sliding active indicators (tabs, sidebar nav pill):
 * a stiff spring that settles in ~200ms — inside the phase-6a 150–250ms band —
 * with just enough damping to land without wobble.
 */
export const transitionGlide: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 40,
}

/**
 * The one-shot celebration sheen's glide (phase 6b): slow enough to read as a
 * deliberate sweep across the celebrated card or row, done inside a second.
 */
export const transitionSweep: Transition = {
  duration: 0.9,
  ease: 'easeInOut',
}

/**
 * The staggered grid entrance shared by card grids (phase 6a) on the DataTable
 * pattern: spread `container` onto the grid and `item` onto each card. Callers
 * pass their own `useReducedMotion()` read; under it both collapse to a static
 * render. Grids whose items can leave without a page change also wrap the items
 * in `<AnimatePresence>` and hand each an `exit` of `fadeUpHidden` (an object
 * target, for the variant-inheritance reason documented above).
 */
export function staggerEntrance(reduce: boolean | null) {
  return {
    container: {
      variants: reduce ? undefined : staggerContainer,
      initial: reduce ? (false as const) : ('hidden' as const),
      animate: reduce ? (false as const) : ('visible' as const),
    },
    item: {
      variants: reduce ? undefined : fadeUp,
      transition: transitionFast,
    },
  }
}

/**
 * Recharts animation props for a chart draw-in (phase 6a). Recharts animates
 * outside framer, so the reduced-motion opt-out cannot ride `MotionConfig` —
 * callers pass their own `useReducedMotion()` read and spread the result onto
 * each series (`<Bar>`, `<Line>`, …).
 */
export function chartDrawIn(reduce: boolean | null) {
  return {
    isAnimationActive: !reduce,
    animationDuration: 250,
    animationEasing: 'ease-out',
  } as const
}
