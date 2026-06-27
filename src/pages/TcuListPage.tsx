import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/PageHeader'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useTcuActivities, useTcuTrainees } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { useStore } from '@/data/store'
import { LogTcuActivityDialog } from '@/components/tcu/LogTcuActivityDialog'
import type { TcuFilters } from '@/data/api/tcu'

const TARGET_HOURS = 300

export function TcuListPage() {
  const { t } = useTranslation()
  const { formatDate, formatNumber } = useFormat()
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const [filters, setFilters] = useState<TcuFilters>({})
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const { data = [], isLoading } = useTcuActivities(filters)
  const { data: trainees = [], isLoading: traineesLoading } = useTcuTrainees()

  const approvedHours = data.reduce((sum, a) => sum + (a.status === 'approved' ? a.hours : 0), 0)
  const pendingHours = data.reduce((sum, a) => sum + (a.status === 'pending' ? a.hours : 0), 0)
  const hasFilters = Boolean(filters.traineeId)
  const count = data.length

  // For TCU role, show self progress; for admin, show selected trainee or all
  const isTcuRole = role === 'tcu'
  const selfTrainee = isTcuRole ? trainees.find((t) => t.id === userId) : null

  // Calculate progress toward 300 hours (approved hours only)
  const progressPercent = Math.min((approvedHours / TARGET_HOURS) * 100, 100)

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
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{t('tcu.dashboard.progress')}</p>
              <p className="text-xs text-muted-foreground">
                {selfTrainee.firstName} {selfTrainee.lastName}
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-lg tabular-nums">
                {formatNumber(approvedHours)} / {TARGET_HOURS}
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
                  {t.firstName} {t.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>
      )}

      {isLoading ? (
        <SkeletonTable rows={8} columns={4} />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? t('tcu.list.emptyFiltered') : t('tcu.list.empty')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('tcu.list.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
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
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          a.status === 'approved'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : a.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {t(`tcu.list.status.${a.status}`)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {trainee?.firstName} {trainee?.lastName}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <LogTcuActivityDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />
    </div>
  )
}
