import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { WorklistCard, type WorklistLimit } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { EnrollmentDecisionButtons } from '@/components/enrollments/EnrollmentDecisionButtons'
import {
  useEnrollmentDecisions,
  useEnrollmentRequestColumns,
  useEnrollmentRows,
  type EnrollmentRow,
} from '@/hooks/useEnrollmentRequests'

/**
 * The queue of pending enrollment requests: a Teacher's own Courses, or every
 * request for an admin. A {@link WorklistCard} around a {@link DataTable} that
 * stays on screen with the compact empty state when nothing is waiting (ADR-0050).
 * Requests read oldest first (FIFO). With a `limit` (the admin dashboard) it shows
 * only the longest-waiting rows and links to the full page; the count badge still
 * reports every pending request. Rows, columns, and decisions are the same ones
 * the Enrollments page reads ({@link useEnrollmentRows}).
 */
export function EnrollmentApprovalQueue({ limit }: { limit?: WorklistLimit } = {}) {
  const { t } = useTranslation()
  const allRows = useEnrollmentRows()
  const baseColumns = useEnrollmentRequestColumns()
  const decisions = useEnrollmentDecisions()

  if (allRows === null) return <SkeletonCard lines={3} />

  const rows = allRows.filter((r) => r.enrollment.status === 'pending')

  // A single column set drives both the desktop table and the mobile cards
  // (via `renderCard`), so the two layouts can never drift. Both copies of a
  // row live in the DOM — one hidden per breakpoint — so the shared test ids
  // resolve to a single element only when scoped through the visible row.
  const columns: DataTableColumn<EnrollmentRow>[] = [
    ...baseColumns,
    {
      id: 'actions',
      header: t('enrollments.approvalQueue.actions'),
      align: 'right',
      cell: (r) => <EnrollmentDecisionButtons row={r} decisions={decisions} />,
    },
  ]

  const shown = limit ? rows.slice(0, limit.rows) : rows

  return (
    <WorklistCard
      title={t('enrollments.approvalQueue.title')}
      icon={UserPlus}
      count={rows.length}
      emptyLabel={t('enrollments.approvalQueue.empty')}
      viewAll={
        limit && rows.length > 0
          ? {
              to: limit.viewAllTo,
              label: t('dashboard.worklist.viewAllCount', { n: rows.length }),
            }
          : undefined
      }
      body={
        rows.length > 0 ? (
          <DataTable
            data={shown}
            columns={columns}
            getRowKey={(r) => r.id}
            renderCard={(r) => (
              <DataTableCard
                row={r}
                columns={columns}
                titleColumnId="student"
                actionsColumnId="actions"
              />
            )}
          />
        ) : undefined
      }
    />
  )
}
