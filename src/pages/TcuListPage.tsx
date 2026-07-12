import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NoResults } from '@/components/shared/NoResults'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { ListHeaderBand } from '@/components/shared/ListHeaderBand'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useTcuActivities, useTcuTrainees, useApproveTcuActivity } from '@/hooks/api'
import { listViewState } from '@/lib/listViewState'
import { resolveQueries } from '@/lib/resolveQueries'
import { tcuHoursByStatus, TCU_TARGET_HOURS } from '@/lib/tcuHours'
import { fullName } from '@/lib/personName'
import { useFormat } from '@/hooks/useFormat'
import { useStore } from '@/data/store'
import { LogTcuActivityDialog } from '@/components/tcu/LogTcuActivityDialog'
import type { TcuFilters } from '@/data/api/tcu'
import type { TcuActivityStatus } from '@/types'

function statusVariant(status: TcuActivityStatus): 'success' | 'warning' | 'destructive' {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  return 'destructive'
}

export function TcuListPage() {
  const { t } = useTranslation()
  const { formatDate, formatNumber } = useFormat()
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const courses = useStore((s) => s.courses)
  const [filters, setFilters] = useState<TcuFilters>({})
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const activitiesQuery = useTcuActivities(filters)
  const traineesQuery = useTcuTrainees()
  const { data = [] } = activitiesQuery
  const { data: trainees = [], isLoading: traineesLoading } = traineesQuery
  // Both name-rendering tables (the roster and the approval queue) read trainee
  // names from the separate trainees query, so their data dependency is BOTH
  // queries — gate on both, not activities alone (ADR-0030). Gating on activities
  // only flashed blank names in the window where activities resolved first.
  const roster = resolveQueries([activitiesQuery, traineesQuery])
  const approveMutation = useApproveTcuActivity()

  const { approved: approvedHours, pending: pendingHours } = tcuHoursByStatus(data)
  const hasFilters = Boolean(filters.traineeId)
  const count = data.length

  // For TCU role, show self progress; for admin, show selected trainee or all
  const isTcuRole = role === 'tcu'
  const isTeacher = role === 'teacher'
  const selfTrainee = isTcuRole ? trainees.find((t) => t.id === userId) : null

  // Calculate progress toward 300 hours (approved hours only)
  const progressPercent = Math.min((approvedHours / TCU_TARGET_HOURS) * 100, 100)

  // For teachers: get their courses and pending activities for their trainees
  const teacherCourseIds = isTeacher
    ? courses.filter((c) => c.teacherId === userId).map((c) => c.id)
    : []
  const pendingActivitiesForTeacher = isTeacher
    ? data.filter((a) => {
        const trainee = trainees.find((t) => t.id === a.traineeId)
        return a.status === 'pending' && trainee && teacherCourseIds.includes(trainee.courseId)
      })
    : []

  // For admin: show all pending activities
  const pendingActivitiesForAdmin =
    role === 'admin' ? data.filter((a) => a.status === 'pending') : []
  const pendingActivities =
    role === 'admin' ? pendingActivitiesForAdmin : pendingActivitiesForTeacher

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tcu.list.title')}
        description={t('tcu.list.subtitle')}
        action={
          <Button variant="default" size="sm" onClick={() => setLogDialogOpen(true)}>
            {t('tcu.dialog.logActivityTitle')}
          </Button>
        }
      />

      {isTcuRole && selfTrainee && (
        <Card>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('tcu.dashboard.progress')}</p>
                <p className="text-xs text-muted-foreground">{fullName(selfTrainee)}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-lg tabular-nums">
                  {formatNumber(approvedHours)} / {TCU_TARGET_HOURS}
                </p>
                <p className="text-xs text-muted-foreground">{t('tcu.dashboard.approvedHours')}</p>
              </div>
            </div>
            <Progress value={progressPercent} className="h-2" />
            {pendingHours > 0 && (
              <p className="text-xs text-muted-foreground">
                + {formatNumber(pendingHours)} {t('tcu.dashboard.pendingHours')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!roster.isPending && (isTeacher || role === 'admin') && pendingActivities.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('tcu.approvalQueue.title')}</h2>
          <Card className="overflow-hidden py-0 gap-0">
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
                  const trainee = trainees.find((x) => x.id === a.traineeId)
                  return (
                    <TableRow key={a.id} className="h-12 hover:bg-muted/40">
                      <TableCell>{a.title}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatNumber(a.hours)}
                      </TableCell>
                      <TableCell>{formatDate(a.date)}</TableCell>
                      <TableCell>{trainee && fullName(trainee)}</TableCell>
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
          </Card>
        </section>
      )}

      {!isTcuRole && !traineesLoading && trainees.length > 0 && (
        <section aria-label={t('common.a11y.filters')}>
          <Select
            value={filters.traineeId ?? 'any'}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, traineeId: v === 'any' ? undefined : v }))
            }
          >
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t('tcu.list.filters.traineePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('tcu.list.filters.anyTrainee')}</SelectItem>
              {trainees.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {fullName(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      )}

      <ListView
        state={listViewState({ isLoading: roster.isPending, count, hasFilters })}
        skeleton={<SkeletonTable rows={8} columns={4} />}
        empty={<NoResults message={t('tcu.list.empty')} />}
        noResults={<NoResults message={t('tcu.list.emptyFiltered')} />}
        content={
          <Card className="overflow-hidden py-0 gap-0">
            <ListHeaderBand label={t('tcu.list.title')} count={count} />
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>{t('tcu.list.columns.title')}</TableHead>
                  <TableHead className="text-right font-mono tabular-nums">
                    {t('tcu.list.columns.hours')}
                  </TableHead>
                  <TableHead>{t('tcu.list.columns.date')}</TableHead>
                  <TableHead>{t('tcu.list.columns.status')}</TableHead>
                  <TableHead>{t('tcu.list.columns.trainee')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((a) => {
                  const trainee = trainees.find((x) => x.id === a.traineeId)
                  return (
                    <TableRow key={a.id} className="h-12 hover:bg-muted/40">
                      <TableCell>{a.title}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatNumber(a.hours)}
                      </TableCell>
                      <TableCell>{formatDate(a.date)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(a.status)}>
                          {t(`tcu.list.status.${a.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>{trainee && fullName(trainee)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </Card>
        }
      />

      <LogTcuActivityDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />
    </div>
  )
}
