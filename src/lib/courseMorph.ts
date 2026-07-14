/**
 * The shared element that ties a Course's name in a list to the heading of its
 * detail page (ADR-0047 phase 6c): both ends render a `motion.span` under this
 * `layoutId`, and framer morphs one into the other across the route change — the
 * same mechanism as the sidebar's active pill, which already glides between two
 * nodes that swap in a single commit.
 *
 * Two invariants keep the morph honest, each enforced at its own end:
 *
 * - **Exactly one source node per Course.** The DataTable renders every row twice
 *   (the real table, plus a `display:none` stacked card below `sm`), so a
 *   `layoutId` set unconditionally in a column cell would register two nodes for
 *   one Course — and framer would be free to lead the morph from the hidden one,
 *   which measures as a zero-area box. `CourseTitleLink` therefore takes ownership
 *   of the shared element as a prop, and the list hands it to whichever surface
 *   the viewport is actually showing (`useDataTableSurface`).
 *
 * - **The target must paint in the commit the source leaves in.** A detail page
 *   that opens on its loading gate paints the heading only after its queries
 *   resolve — commits later, with the list long unmounted and nothing left to
 *   morph from. `useCourseMorphTarget` arms the heading only for a mount whose
 *   ADR-0030 gate was already clear on the first render (i.e. React Query served
 *   it from cache); every other navigation falls back to a plain, unanimated one.
 *   `usePrefetchCourseDetail` warms that cache on hover/focus, which is what makes
 *   the armed path the common one rather than a rarity.
 *
 * The DOM carries `data-morph-id` alongside: a `layoutId` leaves no trace in the
 * markup, so the pairing — and the one-node-per-Course invariant above — would
 * otherwise be untestable.
 */
export function courseMorphLayoutId(courseId: string): string {
  return `course-title-${courseId}`
}
