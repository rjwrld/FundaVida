import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { UsePaginationResult } from '@/hooks/usePagination'

export interface PagerProps {
  /** A `usePagination` result; the pager reads its controls and counters. */
  pagination: UsePaginationResult<unknown>
  /** Selectable page sizes. Defaults to `[10, 25, 50]`. */
  pageSizeOptions?: number[]
}

/**
 * The accessible pagination control shared by every windowed surface — the
 * `DataTable` primitive and the standalone gallery/grouped-list views. It owns
 * the labelled "Page X of Y" live region, the row-range readout, the page-size
 * select, and the keyboard-operable first/prev/next/last buttons (ADR-0026), so
 * each list doesn't reinvent them. Presentation only: it never touches the
 * scoped data, it just drives the passed-in `usePagination` controls.
 */
export function Pager({ pagination, pageSizeOptions = [10, 25, 50] }: PagerProps) {
  const { t } = useTranslation()
  const {
    page,
    pageSize,
    pageCount,
    range,
    total,
    canPrev,
    canNext,
    setPageSize,
    first,
    prev,
    next,
    last,
  } = pagination

  return (
    <nav
      aria-label={t('common.pagination.label')}
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground"
    >
      <div className="flex items-center gap-4">
        <p role="status" aria-live="polite">
          {t('common.pagination.status', { page, pageCount })}
        </p>
        <span className="hidden tabular-nums sm:inline">
          {t('common.pagination.range', { from: range.from, to: range.to, total })}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <span>{t('common.pagination.pageSize')}</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 rounded-lg border border-input bg-background px-2 text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          {(
            [
              {
                key: 'first',
                label: t('common.pagination.first'),
                Icon: ChevronsLeft,
                disabled: !canPrev,
                onClick: first,
              },
              {
                key: 'previous',
                label: t('common.pagination.previous'),
                Icon: ChevronLeft,
                disabled: !canPrev,
                onClick: prev,
              },
              {
                key: 'next',
                label: t('common.pagination.next'),
                Icon: ChevronRight,
                disabled: !canNext,
                onClick: next,
              },
              {
                key: 'last',
                label: t('common.pagination.last'),
                Icon: ChevronsRight,
                disabled: !canNext,
                onClick: last,
              },
            ] as const
          ).map(({ key, label, Icon, disabled, onClick }) => (
            <Button
              key={key}
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
              aria-label={label}
              disabled={disabled}
              onClick={onClick}
            >
              <Icon aria-hidden="true" />
            </Button>
          ))}
        </div>
      </div>
    </nav>
  )
}
