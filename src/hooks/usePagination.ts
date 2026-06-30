import { useMemo, useState } from 'react'

export interface UsePaginationOptions {
  /** Initial rows per page. Defaults to 10. */
  pageSize?: number
}

export interface PageRange {
  /** 1-indexed position of the first row on the current page (0 when empty). */
  from: number
  /** 1-indexed position of the last row on the current page (0 when empty). */
  to: number
}

export interface UsePaginationResult<T> {
  /** 1-indexed current page, clamped to `[1, pageCount]`. */
  page: number
  pageSize: number
  /** Total number of pages, never below 1. */
  pageCount: number
  /** The current page's window of items. */
  pageItems: T[]
  /** Total item count before windowing. */
  total: number
  /** 1-indexed first/last row positions on the current page. */
  range: PageRange
  canPrev: boolean
  canNext: boolean
  /** Sets the rows-per-page and returns to the first page. */
  setPageSize: (size: number) => void
  first: () => void
  prev: () => void
  next: () => void
  last: () => void
}

/**
 * Windows an already-scoped array of items into pages, client-side.
 *
 * Pagination here is presentation only — the caller passes the role-scoped
 * list and the hook merely slices it (ADR-0026). The current page is always
 * clamped into range, so a shrinking `items` array (e.g. a filter narrowing
 * the list) can never leave the window pointing past the end.
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { pageSize: initialPageSize = 10 } = options
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, safePage, pageSize])

  const range: PageRange =
    total === 0
      ? { from: 0, to: 0 }
      : { from: (safePage - 1) * pageSize + 1, to: (safePage - 1) * pageSize + pageItems.length }

  const goto = (next: number) => setPage(Math.min(Math.max(1, next), pageCount))

  return {
    page: safePage,
    pageSize,
    pageCount,
    pageItems,
    total,
    range,
    canPrev: safePage > 1,
    canNext: safePage < pageCount,
    setPageSize: (size: number) => {
      setPageSizeState(size)
      setPage(1)
    },
    first: () => goto(1),
    prev: () => goto(safePage - 1),
    next: () => goto(safePage + 1),
    last: () => goto(pageCount),
  }
}
