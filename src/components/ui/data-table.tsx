import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { usePagination } from '@/hooks/usePagination'
import { cn } from '@/lib/utils'

export interface DataTableColumn<T> {
  /** Stable column identifier (also the React key). */
  id: string
  header: React.ReactNode
  cell: (row: T) => React.ReactNode
  align?: 'left' | 'right'
  sortable?: boolean
  /** Comparable value used when this column is the active sort. */
  sortAccessor?: (row: T) => string | number
  headerClassName?: string
  className?: string
}

type SortDirection = 'asc' | 'desc'

interface SortState {
  columnId: string
  direction: SortDirection
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  getRowKey: (row: T) => string
  /** Initial rows per page. Defaults to 10. */
  pageSize?: number
  /** Selectable page sizes. Defaults to `[10, 25, 50]`. */
  pageSizeOptions?: number[]
  /** Shown in place of the table when `data` is empty. Defaults to a generic message. */
  emptyState?: React.ReactNode
  /**
   * Renders each windowed row as a card. When provided, the desktop table is
   * hidden below `sm` and these cards stack instead — preserving the existing
   * mobile card-stack path. When omitted, the table scrolls horizontally.
   */
  renderCard?: (row: T) => React.ReactNode
}

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

export function DataTable<T>({
  data,
  columns,
  getRowKey,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50],
  emptyState,
  renderCard,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const [sort, setSort] = React.useState<SortState | null>(null)

  const sortedData = React.useMemo(() => {
    if (!sort) return data
    const column = columns.find((c) => c.id === sort.columnId)
    if (!column?.sortAccessor) return data
    const accessor = column.sortAccessor
    const factor = sort.direction === 'asc' ? 1 : -1
    // Copy before sorting so the caller's (scoped) array is never mutated.
    return [...data].sort((a, b) => factor * compareValues(accessor(a), accessor(b)))
  }, [data, columns, sort])

  const {
    page,
    pageSize: currentPageSize,
    pageCount,
    pageItems,
    range,
    total,
    canPrev,
    canNext,
    setPageSize,
    first,
    prev,
    next,
    last,
  } = usePagination(sortedData, { pageSize })

  // Cycle a sortable column: unsorted → asc → desc → unsorted.
  const toggleSort = (columnId: string) =>
    setSort((current) => {
      if (current?.columnId !== columnId) return { columnId, direction: 'asc' }
      if (current.direction === 'asc') return { columnId, direction: 'desc' }
      return null
    })

  const ariaSortFor = (col: DataTableColumn<T>): React.AriaAttributes['aria-sort'] => {
    if (!col.sortable) return undefined
    if (sort?.columnId !== col.id) return 'none'
    return sort.direction === 'asc' ? 'ascending' : 'descending'
  }

  if (data.length === 0) {
    return (
      <>
        {emptyState ?? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t('common.table.empty')}
          </p>
        )}
      </>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card shadow-card',
          renderCard && 'hidden sm:block'
        )}
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {columns.map((col) => {
                const direction = sort?.columnId === col.id ? sort.direction : null
                return (
                  <TableHead
                    key={col.id}
                    aria-sort={ariaSortFor(col)}
                    className={cn(col.align === 'right' && 'text-right', col.headerClassName)}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          col.align === 'right' && 'flex-row-reverse'
                        )}
                      >
                        {col.header}
                        {direction === 'asc' ? (
                          <ArrowUp size={14} aria-hidden="true" />
                        ) : direction === 'desc' ? (
                          <ArrowDown size={14} aria-hidden="true" />
                        ) : (
                          <ArrowUpDown size={14} aria-hidden="true" className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.map((row) => (
              <TableRow key={getRowKey(row)} className="h-12 hover:bg-muted/40">
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    className={cn(col.align === 'right' && 'text-right', col.className)}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {renderCard && (
        <ul className="space-y-3 sm:hidden">
          {pageItems.map((row) => (
            <li key={getRowKey(row)}>{renderCard(row)}</li>
          ))}
        </ul>
      )}

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
              value={currentPageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 rounded-lg border border-input bg-background px-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    </div>
  )
}
