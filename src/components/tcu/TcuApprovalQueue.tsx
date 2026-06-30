import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useTcuActivities, useTcuTrainees, useApproveTcuActivity } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'

/**
 * Renders an approval queue for pending TCU activities.
 * For teachers, this shows pending activities for trainees assigned to their courses.
 * For admins, this shows all pending activities.
 * Only renders when there are pending activities.
 */
export function TcuApprovalQueue() {
  const { t } = useTranslation()
  const { formatDate, formatNumber } = useFormat()
  // Both rides the scope seam (ADR-0012): a Teacher sees activities and trainees
  // for the volunteers assigned to their own Courses; an admin sees all (ADR-0017).
  const { data: activities = [] } = useTcuActivities({})
  const { data: trainees = [] } = useTcuTrainees()
  const approveMutation = useApproveTcuActivity()

  const pendingActivities = activities.filter((a) => a.status === 'pending')

  // Only render if there are pending activities
  if (pendingActivities.length === 0) {
    return null
  }

  const rows = pendingActivities.map((a) => {
    const trainee = trainees.find((x) => x.id === a.traineeId)
    return {
      activity: a,
      traineeName: `${trainee?.firstName ?? ''} ${trainee?.lastName ?? ''}`.trim(),
    }
  })

  const approveButton = (activityId: string, full?: boolean) => (
    <Button
      size="sm"
      variant="default"
      className={full ? 'flex-1' : undefined}
      onClick={() => approveMutation.mutate({ activityId, decision: 'approved' })}
      disabled={approveMutation.isPending}
    >
      {t('common.actions.approve')}
    </Button>
  )

  const rejectButton = (activityId: string, full?: boolean) => (
    <Button
      size="sm"
      variant="outline"
      className={full ? 'flex-1' : undefined}
      onClick={() => approveMutation.mutate({ activityId, decision: 'rejected' })}
      disabled={approveMutation.isPending}
    >
      {t('common.actions.reject')}
    </Button>
  )

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('tcu.approvalQueue.title')}</h2>

      {/* Desktop: a dense table. Hidden on mobile, where columns would push the
          actions off-screen — the same rows render as stacked cards instead. */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-card sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>{t('tcu.list.columns.title')}</TableHead>
              <TableHead className="text-right font-mono tabular-nums">
                {t('tcu.list.columns.hours')}
              </TableHead>
              <TableHead>{t('tcu.list.columns.date')}</TableHead>
              <TableHead>{t('tcu.list.columns.trainee')}</TableHead>
              <TableHead className="text-right">{t('tcu.approvalQueue.approval')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ activity, traineeName }) => (
              <TableRow key={activity.id} className="h-12 hover:bg-muted/40">
                <TableCell>{activity.title}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {formatNumber(activity.hours)}
                </TableCell>
                <TableCell>{formatDate(activity.date)}</TableCell>
                <TableCell>{traineeName}</TableCell>
                <TableCell className="space-x-2 text-right">
                  {approveButton(activity.id)}
                  {rejectButton(activity.id)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: one card per activity with the actions full-width underneath. */}
      <ul className="space-y-3 sm:hidden">
        {rows.map(({ activity, traineeName }) => (
          <li key={activity.id} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="font-medium text-foreground">{activity.title}</p>
            <p className="text-sm text-muted-foreground">{traineeName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(activity.date)} ·{' '}
              <span className="font-mono tabular-nums">{formatNumber(activity.hours)}</span>{' '}
              {t('tcu.list.columns.hours').toLowerCase()}
            </p>
            <div className="mt-3 flex gap-2">
              {approveButton(activity.id, true)}
              {rejectButton(activity.id, true)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
