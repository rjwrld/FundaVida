import { useMediaQuery } from '@/hooks/useMediaQuery'

/**
 * Which branch of the DataTable's dual render the viewport is actually showing.
 * Both are always in the DOM — the table is `hidden sm:block`, the stacked cards
 * `sm:hidden` — so nothing but a media query can tell a caller which of the two
 * copies of a row is the real one. A page whose cells register something
 * viewport-global asks here and hands ownership to the live surface only: the
 * phase-6c course morph registers a `layoutId`, and framer is free to lead the
 * morph from the hidden copy, which measures as a zero-area box.
 *
 * The query hand-mirrors Tailwind's `sm` breakpoint — i.e. the `sm:` classes on
 * those two branches in `ui/data-table.tsx`, which is where it would live if the
 * fast-refresh lint rule let a component file export a hook. The two must move
 * together.
 */
export function useDataTableSurface(): 'table' | 'card' {
  return useMediaQuery('(min-width: 40rem)') ? 'table' : 'card'
}
