import type { ReactNode } from 'react'
import type { ListViewState } from '@/lib/listViewState'

export interface ListViewProps {
  state: ListViewState
  skeleton: ReactNode
  content: ReactNode
  noResults: ReactNode
  /** Optional; the three-state pages omit it and fall back to `noResults`. */
  empty?: ReactNode
}

/**
 * Renders exactly one branch of the list-view discriminant (ADR-0032). The page
 * computes `state` with `listViewState(...)` — the tested seam — and this shell
 * only selects a branch. It owns no filters, columns, or dialogs; each page
 * keeps those verbatim. Deliberately not a `<ListPageShell>`: the pages vary too
 * much for a single component to hold their specifics without becoming a shallow
 * God-component.
 *
 * `empty` is optional and falls back to `noResults`, which is how the pages with
 * no dedicated empty state (only a filtered message) drop straight in.
 */
export function ListView({ state, skeleton, content, noResults, empty }: ListViewProps): ReactNode {
  switch (state) {
    case 'loading':
      return skeleton
    case 'empty':
      return empty ?? noResults
    case 'noResults':
      return noResults
    case 'data':
      return content
  }
}
