/**
 * The four-state render discriminant shared by the list pages (ADR-0032).
 *
 * Eleven list pages hand-rolled the same ordered branch —
 * `isLoading ? loading : count === 0 && !hasFilters ? empty : count === 0 ? noResults : data`
 * — and the branch _ordering_ is the whole bug surface. Read a `count === 0`
 * case before the loading case and an in-flight fetch flashes "empty"/"no
 * results" mid-load; read `empty` before `noResults` and a filtered-to-nothing
 * view wrongly claims the collection itself is empty. Naming the discriminant
 * once fixes the ordering in one place for every list page.
 *
 * `empty` vs `noResults`: an unfiltered, zero-row collection ("nothing here
 * yet") carries a different message from a view filtered down to nothing ("no
 * matches") — only `hasFilters` tells them apart, and only once loading clears.
 */
export type ListViewState = 'loading' | 'empty' | 'noResults' | 'data'

export interface ListViewInput {
  isLoading: boolean
  count: number
  hasFilters: boolean
}

export function listViewState({ isLoading, count, hasFilters }: ListViewInput): ListViewState {
  if (isLoading) return 'loading'
  if (count > 0) return 'data'
  return hasFilters ? 'noResults' : 'empty'
}
