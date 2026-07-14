import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table'
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

/**
 * Per-column presentation carried through TanStack's `meta` escape hatch: the
 * table core knows nothing about alignment or class names, so they ride along
 * on the column def and are read back at render time.
 */
declare module '@tanstack/react-table' {
  // TanStack declares both type params; this augmentation needs neither.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'right'
    className?: string
    headerClassName?: string
  }
}

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
   *
   * Both renders sit in the DOM at every width; only CSS hides one. A page whose
   * cells register anything viewport-global (a `layoutId`, say) must therefore
   * give the two renders different columns and let `useDataTableSurface` — which
   * mirrors the `sm` breakpoint used here — say which one is live.
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

/**
 * Adapt this table's column shape to TanStack's. Every column is an accessor
 * column so the sorted row model has a value to compare; a column without a
 * `sortAccessor` accesses a constant, which — `Array.prototype.sort` being
 * stable — leaves the rows in their original order if it is ever sorted.
 */
function toColumnDefs<T>(columns: DataTableColumn<T>[]): ColumnDef<T, string | number>[] {
  return columns.map((col) => ({
    id: col.id,
    accessorFn: col.sortAccessor ?? (() => ''),
    header: () => col.header,
    cell: (ctx) => col.cell(ctx.row.original),
    enableSorting: col.sortable ?? false,
    sortingFn: (a, b, columnId) =>
      compareValues(a.getValue<string | number>(columnId), b.getValue<string | number>(columnId)),
    meta: { align: col.align, className: col.className, headerClassName: col.headerClassName },
  }))
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
  const [sorting, setSorting] = React.useState<SortingState>([])

  const columnDefs = React.useMemo(() => toColumnDefs(columns), [columns])

  const table = useReactTable({
    data,
    columns: columnDefs,
    state: { sorting },
    onSortingChange: setSorting,
    // Row identity is the caller's key, so a re-sort reorders the existing rows
    // instead of remounting them — which is what lets the exit/enter animations
    // (and any future per-row state) survive it.
    getRowId: (row) => getRowKey(row),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Sorting here is single-column and always cycles asc → desc → unsorted.
    // Two TanStack defaults would break that and neither is loud about it:
    // the first click's direction is inferred from the column's value type
    // (`getAutoSortDir` returns desc for anything non-string, so the numeric
    // columns would open descending), and shift-click accumulates a second
    // sort. `enableSortingRemoval` already defaults to true; it is stated
    // because the third click of the cycle depends on it.
    sortDescFirst: false,
    enableMultiSort: false,
    enableSortingRemoval: true,
  })

  // Pagination stays this table's own (ADR-0026): the Pager is a better control
  // than the registry recipe's, and `usePagination` clamps the window so a
  // shrinking list can never strand it past the end. TanStack sorts; we window.
  const rows = table.getRowModel().rows
  const pagination = usePagination(rows, { pageSize })
  const { pageItems } = pagination

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
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/50 hover:bg-muted/50">
                {headerGroup.headers.map((header) => {
                  const column = header.column
                  const meta = column.columnDef.meta
                  const sortable = column.getCanSort()
                  const direction = column.getIsSorted()
                  const label = flexRender(column.columnDef.header, header.getContext())

                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sortable
                          ? direction === 'asc'
                            ? 'ascending'
                            : direction === 'desc'
                              ? 'descending'
                              : 'none'
                          : undefined
                      }
                      className={cn(meta?.align === 'right' && 'text-right', meta?.headerClassName)}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={column.getToggleSortingHandler()}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-xs font-medium hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            meta?.align === 'right' && 'flex-row-reverse'
                          )}
                        >
                          {label}
                          {direction === 'asc' ? (
                            <ArrowUp size={14} aria-hidden="true" />
                          ) : direction === 'desc' ? (
                            <ArrowDown size={14} aria-hidden="true" />
                          ) : (
                            <ArrowUpDown size={14} aria-hidden="true" className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        label
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
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
                  key={row.id}
                  className="h-12 hover:bg-muted/40"
                  variants={reduce ? undefined : fadeUp}
                  exit={reduce ? undefined : fadeUpHidden}
                  transition={transitionFast}
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta
                    return (
                      <TableCell
                        key={cell.id}
                        className={cn(meta?.align === 'right' && 'text-right', meta?.className)}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    )
                  })}
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
                key={row.id}
                variants={reduce ? undefined : fadeUp}
                exit={reduce ? undefined : fadeUpHidden}
                transition={transitionFast}
              >
                {renderCard(row.original)}
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <Pager pagination={pagination} pageSizeOptions={pageSizeOptions} />
    </div>
  )
}
