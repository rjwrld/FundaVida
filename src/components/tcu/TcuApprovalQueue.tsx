import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { WorklistCard } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { useTcuActivities, useTcuTrainees, useApproveTcuActivity } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { resolveQueries } from '@/lib/resolveQueries'
import { oldestFirst } from '@/lib/tcuActivityOrder'
import { fullName } from '@/lib/personName'
import type { TcuActivity } from '@/types'

interface PendingRow {
  activity: TcuActivity
  traineeName: string
}

/**
 * The queue of pending TCU activities, oldest first (FIFO). Rides the scope seam
 * (ADR-0012): a Teacher sees the volunteers assigned to their own Courses, an
 * admin sees all (ADR-0017). A {@link WorklistCard} around a {@link DataTable} —
 * a table at `sm` and up, stacked cards below — that stays on screen with the
 * compact empty state when nothing is waiting (ADR-0050).
 */
export function TcuApprovalQueue() {
  const { t } = useTranslation()
  const { formatDate, formatNumber } = useFormat()
  // Rows render trainee names from a second read, so gate on both (ADR-0030).
  const gate = resolveQueries([useTcuActivities({}), useTcuTrainees()])
  const approveMutation = useApproveTcuActivity()

  if (gate.isPending) return <SkeletonCard lines={3} />

  const [activities, trainees] = gate.data
  const traineeById = new Map(trainees.map((x) => [x.id, x]))
  const rows: PendingRow[] = oldestFirst(activities.filter((a) => a.status === 'pending')).map(
    (activity) => {
      const trainee = traineeById.get(activity.traineeId)
      // A missing trainee record still gets a name, so no label reads "… by ".
      return {
        activity,
        traineeName: trainee ? fullName(trainee) : t('tcu.approvalQueue.unknownTrainee'),
      }
    }
  )

  const decide = (activityId: string, decision: 'approved' | 'rejected') =>
    approveMutation.mutate({ activityId, decision })

  const columns: DataTableColumn<PendingRow>[] = [
    { id: 'title', header: t('tcu.list.columns.title'), cell: (r) => r.activity.title },
    {
      id: 'hours',
      header: t('tcu.list.columns.hours'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (r) => formatNumber(r.activity.hours),
    },
    { id: 'date', header: t('tcu.list.columns.date'), cell: (r) => formatDate(r.activity.date) },
    { id: 'trainee', header: t('tcu.list.columns.trainee'), cell: (r) => r.traineeName },
    {
      id: 'actions',
      header: t('tcu.approvalQueue.approval'),
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            onClick={() => decide(r.activity.id, 'approved')}
            disabled={approveMutation.isPending}
            aria-label={t('tcu.approvalQueue.approveAria', {
              activity: r.activity.title,
              trainee: r.traineeName,
            })}
          >
            {t('common.actions.approve')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => decide(r.activity.id, 'rejected')}
            disabled={approveMutation.isPending}
            aria-label={t('tcu.approvalQueue.rejectAria', {
              activity: r.activity.title,
              trainee: r.traineeName,
            })}
          >
            {t('common.actions.reject')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <WorklistCard
      title={t('tcu.approvalQueue.title')}
      icon={Clock}
      count={rows.length}
      emptyLabel={t('tcu.approvalQueue.empty')}
      body={
        rows.length > 0 ? (
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(r) => r.activity.id}
            renderCard={(r) => (
              <DataTableCard
                row={r}
                columns={columns}
                titleColumnId="title"
                actionsColumnId="actions"
              />
            )}
          />
        ) : undefined
      }
    />
  )
}
