/**
 * The shared element that ties a Course's name in a list to the heading of its
 * detail page (ADR-0047 phase 6c): both ends render a `MorphSpan` under this
 * `layoutId`, and framer glides one into the other across the route change.
 *
 * The handoff survives the route transition, but not an async gap. `AppLayout`'s
 * outlet is an `<AnimatePresence mode="wait">`: the list plays its exit, unmounts,
 * and only then does the detail page mount — framer carries the source's measured
 * box across that gap, so a heading that paints on its first commit still grows
 * out of the row it was clicked in (verified in-browser: the heading's first
 * painted frame sits on the row's box at the font-size ratio, then glides up).
 * What it cannot survive is the detail page's *own* loading gate. A cold mount
 * paints "Loading…" first and the heading several commits later — long after the
 * source is gone and the transition has settled — so the morph would either miss
 * the handoff or, worse, fire late: a heading popping in at a stale list position
 * and flying up after the page has already arrived. That is the "morph must not
 * fight async data" failure the phase was gated on.
 *
 * The page's *code* is a second kind of lateness, and it bites hardest on the first
 * Course of a session: a plain `React.lazy` route costs a suspended commit on its
 * first render even when the chunk is already cached, and the heading lands after
 * the handoff. The detail route is therefore preloadable — see
 * `lib/preloadableRoute.tsx` — and warmed on the same hover that warms the queries.
 *
 * Two invariants keep the rest honest, each enforced at its own end:
 *
 * - **The target must paint on the mount's first commit.** `useCourseMorphTarget`
 *   arms the heading only when the page's ADR-0030 gate was already clear on the
 *   first render — React Query served every gating query from cache. Every other
 *   navigation, reduced motion included, is plain and unanimated.
 *   `usePrefetchCourseDetail` warms that cache on hover/focus, which is what makes
 *   the armed path the common one rather than a rarity.
 *
 * - **Exactly one source node per Course.** The DataTable renders every row twice
 *   (the real table, plus a `display:none` stacked card below `sm`), so a
 *   `layoutId` set unconditionally in a column cell would register two nodes for
 *   one Course — and framer is free to lead the morph from the hidden one, which
 *   measures as a zero-area box. `CourseTitleLink` therefore takes ownership of the
 *   shared element as a prop, and the list hands it to whichever surface the
 *   viewport is actually showing (`useDataTableSurface`).
 */
export function courseMorphLayoutId(courseId: string): string {
  return `course-title-${courseId}`
}
