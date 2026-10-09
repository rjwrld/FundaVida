import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { AttendanceEmpty } from '@/components/empty-states/AttendanceEmpty'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { useAttendance, useCourses, useSessionExceptions } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { attendanceRollup, type AttendanceRollupRow } from '@/lib/attendanceRollup'
import { clock } from '@/lib/clock'
import { listViewState } from '@/lib/listViewState'
import { resolveQueries } from '@/lib/resolveQueries'

/**
 * The admin's Attendance page (ADR-0051): one row per scoped Course that has held
 * a Session — Course · Campus · Sessions held · Attendance · Unmarked — worst
 * first, each linking to that Course's Sessions, where marking happens. A rollup
 * over the existing reads, never a per-record ledger.
 */
export function AttendanceListPage() {
  const { t } = useTranslation()
  const { formatPercent } = useFormat()
  // Every row joins all three reads, so it waits for all three (ADR-0030): a
  // default-[] attendance window would paint every Course fully unmarked.
  const gate = resolveQueries([useCourses(), useAttendance(), useSessionExceptions()])
  const rows = gate.isPending
    ? []
    : attendanceRollup({
        courses: gate.data[0],
        attendance: gate.data[1],
        sessionExceptions: gate.data[2],
        now: clock.today(),
      })

  const columns: DataTableColumn<AttendanceRollupRow>[] = [
    {
      id: 'course',
      header: t('attendance.list.columns.course'),
      cell: (r) => (
        <Link to={`/app/courses/${r.course.id}#sessions`} className="font-medium hover:underline">
          {r.course.name}
        </Link>
      ),
    },
    { id: 'sede', header: t('courses.form.fields.sede'), cell: (r) => r.course.sede },
    {
      id: 'held',
      header: t('attendance.list.columns.sessionsHeld'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (r) => r.sessionsHeld,
    },
    {
      id: 'rate',
      header: t('attendance.list.columns.rate'),
      cell: (r) =>
        r.rate === null ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <Progress
              value={Math.round(r.rate * 100)}
              aria-label={t('attendance.list.rateAria', {
                course: r.course.name,
                rate: formatPercent(r.rate),
              })}
              className="h-1.5 w-16"
            />
            <span className="text-sm tabular-nums">{formatPercent(r.rate)}</span>
          </div>
        ),
    },
    {
      id: 'unmarked',
      header: t('attendance.list.columns.unmarked'),
      cell: (r) =>
        r.unmarked === 0 ? (
          <span className="text-muted-foreground">—</span>
        ) : r.live ? (
          <Badge variant="warning">{t('attendance.list.unmarked', { count: r.unmarked })}</Badge>
        ) : (
          // A closed cohort's gaps are final (ADR-0024): a record, not a task.
          <span className="text-sm text-muted-foreground">
            {t('attendance.list.unmarked', { count: r.unmarked })}
          </span>
        ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t('attendance.list.title')} />

      <ListView
        state={listViewState({ isLoading: gate.isPending, count: rows.length, hasFilters: false })}
        skeleton={<SkeletonTable rows={8} columns={5} />}
        noResults={<AttendanceEmpty />}
        content={
          <DataTable
            data={rows}
            columns={columns}
            getRowKey={(r) => r.course.id}
            renderCard={(r) => <DataTableCard row={r} columns={columns} titleColumnId="course" />}
          />
        }
      />
    </div>
  )
}
