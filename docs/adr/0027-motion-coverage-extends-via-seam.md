# Motion coverage extends to lists, routes, and toasts through the existing seam

_Proposed (planning milestone "Certificate lifecycle rework + UI/UX overhaul")._

The app already has a motion seam: `framer-motion` is a dependency, `src/lib/motion.ts` defines the shared variants and transitions (`fadeIn`, `fadeUp`, `scaleIn`, `staggerContainer`, `transitionDefaults`), and `main.tsx` wraps the tree in `<MotionConfig reducedMotion="user">` so `prefers-reduced-motion` is honored everywhere for free. What is missing is _coverage_ — the dashboards, landing, and certificates page animate, but route changes, list add/remove, toast enter/exit, and progress/number motion outside the landing page do not. This ADR codifies `lib/motion.ts` as the single source of motion tokens and extends usage to those surfaces: `AnimatePresence` on the route outlet and on list/table row mutations, enter/exit on toasts, and the existing `NumberTicker`/progress motion on dashboards and detail pages.

No new dependency and no new motion system: every added animation draws its duration and easing from the existing tokens, so the app keeps one on-brand motion vocabulary rather than accruing inline one-offs. Because reduced-motion is already global, the contract is simply that new motion must degrade to none under it — verified, not assumed.

## Consequences

- New animations reuse `lib/motion.ts` variants; an ad-hoc inline `animate` prop is a review smell.
- Reduced-motion behavior is asserted in tests for the new surfaces (route, list, toast), since these are the first places a missed `MotionConfig` boundary would show.
- Route and list motion must not introduce layout shift; presence animations target opacity/transform, not layout properties.
