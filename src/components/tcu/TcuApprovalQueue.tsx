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
import { useStore } from '@/data/store'

/**
 * Renders an approval queue for pending TCU activities.
 * For teachers, this shows pending activities for trainees assigned to their courses.
 * For admins, this shows all pending activities.
 * Only renders when there are pending activities.
 */
export function TcuApprovalQueue() {
  const { t } = useTranslation()
  const { formatDate, formatNumber } = useFormat()
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const courses = useStore((s) => s.courses)
  const allTrainees = useStore((s) => s.tcuTrainees)
  const { data = [] } = useTcuActivities({})
  const { data: scopedTrainees = [] } = useTcuTrainees()
  const approveMutation = useApproveTcuActivity()

  // For teachers: get their courses and pending activities for their trainees.
  // We use allTrainees from the store (not the scoped list from the hook) because
  // teachers don't have a trainees scope and useTcuTrainees returns empty for them.
  const isTeacher = role === 'teacher'
  const teacherCourseIds = isTeacher
    ? courses.filter((c) => c.teacherId === userId).map((c) => c.id)
    : []
  const pendingActivitiesForTeacher = isTeacher
    ? data.filter((a) => {
        const trainee = allTrainees.find((t) => t.id === a.traineeId)
        return a.status === 'pending' && trainee && teacherCourseIds.includes(trainee.courseId)
      })
    : []

  // For admin: show all pending activities, use scoped trainees from hook
  const traineesForAdmin = role === 'admin' ? scopedTrainees : []
  const pendingActivitiesForAdmin =
    role === 'admin' ? data.filter((a) => a.status === 'pending') : []
  const pendingActivities =
    role === 'admin' ? pendingActivitiesForAdmin : pendingActivitiesForTeacher

  // Only render if there are pending activities
  if (pendingActivities.length === 0) {
    return null
  }

  // Get the trainees to display in the table
  const traineesToDisplay = isTeacher ? allTrainees : traineesForAdmin

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('tcu.approvalQueue.title')}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
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
            {pendingActivities.map((a) => {
              const trainee = traineesToDisplay.find((x) => x.id === a.traineeId)
              return (
                <TableRow key={a.id} className="h-12 hover:bg-muted/40">
                  <TableCell>{a.title}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatNumber(a.hours)}
                  </TableCell>
                  <TableCell>{formatDate(a.date)}</TableCell>
                  <TableCell>
                    {trainee?.firstName} {trainee?.lastName}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() =>
                        approveMutation.mutate({
                          activityId: a.id,
                          decision: 'approved',
                        })
                      }
                      disabled={approveMutation.isPending}
                    >
                      {t('common.actions.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        approveMutation.mutate({
                          activityId: a.id,
                          decision: 'rejected',
                        })
                      }
                      disabled={approveMutation.isPending}
                    >
                      {t('common.actions.reject')}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
