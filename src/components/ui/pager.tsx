import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UsePaginationResult } from '@/hooks/usePagination'

export interface PagerProps {
  /** A `usePagination` result; the pager reads its controls and counters. */
  pagination: UsePaginationResult<unknown>
  /** Selectable page sizes. Defaults to `[10, 25, 50]`. */
  pageSizeOptions?: number[]
  /** Extra classes for the nav — chrome that should vanish with the pager. */
  className?: string
}

/**
 * The accessible pagination control shared by every windowed surface — the
 * `DataTable` primitive and the standalone gallery/grouped-list views. It owns
 * the labelled "Page X of Y" live region, the row-range readout, the page-size
 * select, and the keyboard-operable first/prev/next/last buttons (ADR-0026), so
 * each list doesn't reinvent them. Presentation only: it never touches the
 * scoped data, it just drives the passed-in `usePagination` controls.
 *
 * It renders nothing when every row fits on the smallest page size (the current
 * one included — a table may open below its smallest option): there is then no
 * page to move to and no size choice that changes what is shown, so the control
 * would be pure chrome. Decided here, once, for every surface — callers render
 * it unconditionally and never guard on `pageCount`.
 */
export function Pager({ pagination, pageSizeOptions = [10, 25, 50], className }: PagerProps) {
  const { t } = useTranslation()
  const pageSizeLabelId = useId()
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

  if (total <= Math.min(pageSize, ...pageSizeOptions)) return null

  return (
    <nav
      aria-label={t('common.pagination.label')}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground',
        className
      )}
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
        <div className="flex items-center gap-2">
          {/* Still names the Select below `sm`, where a three-line wrap would crowd the controls. */}
          <span id={pageSizeLabelId} className="whitespace-nowrap max-sm:sr-only">
            {t('common.pagination.pageSize')}
          </span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger size="sm" aria-labelledby={pageSizeLabelId} className="text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
