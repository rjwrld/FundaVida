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
