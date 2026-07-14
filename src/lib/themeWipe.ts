/**
 * The theme-toggle circular wipe on the View Transitions API (ADR-0047 phase
 * 6b), strictly a progressive enhancement: without the API (Firefox, jsdom) or
 * under reduced motion, `apply` just runs and the theme snaps exactly as it
 * always did. With it, the new theme is revealed by a circle growing from
 * `origin` (the toggle button) to cover the viewport. The stock crossfade on
 * `::view-transition-*(root)` is disabled in index.css — this clip-path
 * animation is the only driver.
 */
export function themeWipe(apply: () => void, origin?: { x: number; y: number }): void {
  if (
    typeof document.startViewTransition !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    apply()
    return
  }

  const transition = document.startViewTransition(apply)
  transition.ready
    .then(() => {
      const x = origin?.x ?? window.innerWidth
      const y = origin?.y ?? 0
      // The circle must reach the farthest viewport corner from the origin.
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )
      document.documentElement.animate(
        {
          clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
        },
        { duration: 450, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' }
      )
    })
    .catch(() => {
      // `ready` rejects when the browser skips the transition (rapid toggles,
      // hidden tab). The theme change itself already applied — nothing to do.
    })
}
