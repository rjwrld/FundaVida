import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { NoResults } from '@/components/shared/NoResults'
import { Pager } from '@/components/ui/pager'
import { usePagination } from '@/hooks/usePagination'
import { fadeUp, fadeUpHidden, staggerContainer, transitionFast } from '@/lib/motion'
import { cn } from '@/lib/utils'

// Animate row presence through the shared motion tokens (ADR-0027). Rows fade
// and rise in on mount (staggered by the body) and fade out on removal; under
// prefers-reduced-motion the body opts out entirely so nothing animates.
//
// The rows carry no `initial`/`animate` of their own: they inherit the body's,
// which is what subjects them to its `staggerChildren`. That inheritance is
// fragile in two ways framer does not warn about (#349) — a *string* variant
// label in any variant prop (`exit` included) makes the row variant-controlling
// and severs it, hence `fadeUpHidden`; and an `<AnimatePresence initial={false}>`
// would suppress the entrance of every child present at its first mount, which
// — inside a body that remounts per page — is every row of every page.
const MotionTableBody = motion.create(TableBody)
const MotionTableRow = motion.create(TableRow)

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

export interface DataTableCardProps<T> {
  row: T
  columns: DataTableColumn<T>[]
  /** Column whose cell is the card's prominent title (rendered without a label). */
  titleColumnId: string
  /** Optional column rendered top-right (e.g. row actions), not as a labeled row. */
  actionsColumnId?: string
}

/**
 * The mobile counterpart of a {@link DataTable} row: the same column cells laid
 * out as a card. Pass this from a page's `renderCard` so the card and the table
 * always show identical data. The title column reads as the heading, the actions
 * column (if any) sits top-right, and every remaining column becomes a
 * `header: cell` label/value pair.
 */
export function DataTableCard<T>({
  row,
  columns,
  titleColumnId,
  actionsColumnId,
}: DataTableCardProps<T>) {
  const titleColumn = columns.find((c) => c.id === titleColumnId)
  const actionsColumn = actionsColumnId ? columns.find((c) => c.id === actionsColumnId) : undefined
  const detailColumns = columns.filter((c) => c.id !== titleColumnId && c.id !== actionsColumnId)

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 font-medium text-foreground">{titleColumn?.cell(row)}</div>
        {actionsColumn ? <div className="shrink-0">{actionsColumn.cell(row)}</div> : null}
      </div>
      {detailColumns.length > 0 && (
        <dl className="mt-3 space-y-1.5">
          {detailColumns.map((col) => (
            <div key={col.id} className="flex items-baseline justify-between gap-3 text-sm">
              <dt className="shrink-0 text-muted-foreground">{col.header}</dt>
              <dd className="min-w-0 text-right text-foreground">{col.cell(row)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
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
  const reduce = useReducedMotion()
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

  const pagination = usePagination(sortedData, { pageSize })
  const { pageItems } = pagination

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
    return <>{emptyState ?? <NoResults message={t('common.table.empty')} />}</>
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border bg-card',
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
                          'inline-flex items-center gap-1.5 rounded-xs font-medium hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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
          <MotionTableBody
            // Remount per page so each page entrance re-runs the staggered fade.
            key={pagination.page}
            variants={reduce ? undefined : staggerContainer}
            initial={reduce ? false : 'hidden'}
            animate={reduce ? false : 'visible'}
          >
            <AnimatePresence>
              {pageItems.map((row) => (
                <MotionTableRow
                  key={getRowKey(row)}
                  className="h-12 hover:bg-muted/40"
                  variants={reduce ? undefined : fadeUp}
                  exit={reduce ? undefined : fadeUpHidden}
                  transition={transitionFast}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn(col.align === 'right' && 'text-right', col.className)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </MotionTableRow>
              ))}
            </AnimatePresence>
          </MotionTableBody>
        </Table>
      </div>

      {renderCard && (
        <motion.ul
          key={pagination.page}
          className="space-y-3 sm:hidden"
          variants={reduce ? undefined : staggerContainer}
          initial={reduce ? false : 'hidden'}
          animate={reduce ? false : 'visible'}
        >
          <AnimatePresence>
            {pageItems.map((row) => (
              <motion.li
                key={getRowKey(row)}
                variants={reduce ? undefined : fadeUp}
                exit={reduce ? undefined : fadeUpHidden}
                transition={transitionFast}
              >
                {renderCard(row)}
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <Pager pagination={pagination} pageSizeOptions={pageSizeOptions} />
    </div>
  )
}
