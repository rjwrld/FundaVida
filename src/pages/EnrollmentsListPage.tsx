import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NoResults } from '@/components/shared/NoResults'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { EnrollmentsEmpty } from '@/components/empty-states/EnrollmentsEmpty'
import { EnrollmentDecisionButtons } from '@/components/enrollments/EnrollmentDecisionButtons'
import {
  useEnrollmentDecisions,
  useEnrollmentRequestColumns,
  useEnrollmentRows,
  type EnrollmentRow,
} from '@/hooks/useEnrollmentRequests'
import { useDeleteEnrollment } from '@/hooks/api'
import { useStore } from '@/data/store'
import { isLiveCohort } from '@/lib/courseDisplayState'
import { listViewState } from '@/lib/listViewState'
import { can } from '@/permissions'
import { ENROLLMENT_VARIANT } from '@/lib/statusVariant'

const STATUS_FILTERS = ['pending', 'approved', 'all'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

/**
 * The admin's enrollment request queue (ADR-0051, amends ADR-0023): one flat
 * table — Student · Course · Campus · Requested — opening on the pending
 * requests. A pending row is decided in place with the same rows, columns, and
 * mutations as the dashboard's approval queue; an approved row of a live cohort
 * can be unenrolled. Approve/reject/unenroll refresh every reader of the
 * enrollments slice — the dashboard counts, the rosters, the browse seats —
 * through the write-set invalidation (ADR-0029).
 */
export function EnrollmentsListPage() {
  const { t } = useTranslation()
  const role = useStore((s) => s.role)
  const currentUserId = useStore((s) => s.currentUserId)
  const allRows = useEnrollmentRows()
  const baseColumns = useEnrollmentRequestColumns({ includeSede: true })
  const decisions = useEnrollmentDecisions()
  const deleteEnrollment = useDeleteEnrollment()

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [pendingDelete, setPendingDelete] = useState<EnrollmentRow | null>(null)

  const canDelete = role
    ? can(role, 'delete', 'enrollments', { userId: currentUserId ?? undefined })
    : false
  // Approve is per Course (courseOwned for a Teacher, ADR-0023), so it is checked
  // with the row's Course in context — admin passes unconditionally.
  const canApprove = (row: EnrollmentRow) =>
    role
      ? can(role, 'approve', 'enrollments', {
          course: row.course,
          userId: currentUserId ?? undefined,
        })
      : false
  // A closed cohort is terminal (ADR-0024): the store rejects an unenroll from it.
  const canUnenroll = (row: EnrollmentRow) =>
    canDelete && row.enrollment.status === 'approved' && isLiveCohort(row.course ?? null)

  const visible = useMemo(() => {
    if (!allRows) return []
    const q = query.trim().toLowerCase()
    return allRows.filter((r) => {
      if (statusFilter !== 'all' && r.enrollment.status !== statusFilter) return false
      if (q && !r.studentName.toLowerCase().includes(q)) return false
      return true
    })
  }, [allRows, statusFilter, query])

  const columns: DataTableColumn<EnrollmentRow>[] = [
    ...baseColumns,
    {
      id: 'actions',
      header: t('enrollments.approvalQueue.actions'),
      align: 'right',
      cell: (r) => {
        if (r.enrollment.status === 'pending' && canApprove(r)) {
          return <EnrollmentDecisionButtons row={r} decisions={decisions} />
        }
        if (canUnenroll(r)) {
          return (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPendingDelete(r)}
              aria-label={t('common.actions.deleteItem', { name: r.studentName })}
            >
              {t('enrollments.list.unenroll')}
            </Button>
          )
        }
        return (
          <Badge variant={ENROLLMENT_VARIANT[r.enrollment.status]}>
            {t(`enrollments.status.${r.enrollment.status}`)}
          </Badge>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t('enrollments.list.title')} />

      <section aria-label={t('common.a11y.filters')} className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('enrollments.list.searchPlaceholder')}
            aria-label={t('enrollments.list.searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-40" aria-label={t('enrollments.list.filterStatus')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`enrollments.list.statusFilter.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <ListView
        // No enrollments at all is the illustrated empty state; enrollments that
        // the filter hides read as a quiet line instead.
        state={listViewState({
          isLoading: allRows === null,
          count: visible.length,
          hasFilters: (allRows?.length ?? 0) > 0,
        })}
        skeleton={<SkeletonTable rows={8} columns={5} />}
        empty={<EnrollmentsEmpty />}
        noResults={
          <NoResults
            message={
              statusFilter === 'pending' && !query.trim()
                ? t('enrollments.approvalQueue.empty')
                : t('enrollments.list.emptyFiltered')
            }
          />
        }
        content={
          <DataTable
            data={visible}
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
        }
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('common.confirmDelete.title')}
        description={t('enrollments.list.unenrollConfirm')}
        confirmLabel={t('enrollments.list.unenroll')}
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteEnrollment.mutate(pendingDelete.id)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
      />
    </div>
  )
}
