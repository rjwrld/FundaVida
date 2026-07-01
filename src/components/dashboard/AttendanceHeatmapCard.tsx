import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { clock } from '@/lib/clock'
import { attendanceHeatmapCells } from '@/lib/dashboard'
import { useAttendance } from '@/hooks/api/attendance'
import { AttendanceHeatmap } from './AttendanceHeatmap'

/**
 * Dashboard card wrapping the salvaged {@link AttendanceHeatmap} (ADR-0028).
 * Reads the role-scoped attendance query and derives the daily-rate cells, so
 * admin sees every Sede's attendance without any raw store access.
 */
export function AttendanceHeatmapCard() {
  const { t } = useTranslation()
  const { data: attendance = [] } = useAttendance()

  const cells = useMemo(() => attendanceHeatmapCells(attendance, clock.now()), [attendance])

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-foreground">
            {t('dashboard.attendanceHeatmap.title')}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t('dashboard.attendanceHeatmap.subtitle')}
          </p>
        </div>
        <CalendarDays className="size-4 shrink-0 text-brand-green-700" aria-hidden="true" />
      </header>
      {attendance.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.attendanceHeatmap.empty')}</p>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <AttendanceHeatmap data={cells} />
        </div>
      )}
    </article>
  )
}
