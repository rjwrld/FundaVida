import { useTranslation } from 'react-i18next'
import { useFormat } from '@/hooks/useFormat'
import type { HeatmapCell } from '@/lib/dashboard'

interface AttendanceHeatmapProps {
  data: HeatmapCell[]
}

// Buckets carry a dark-mode variant so the sequential scale ramps dark->bright
// as attendance rises on the Ink canvas. The light-end ramp stops (green-100/200)
// read as faint on white but, without an override, become the brightest cells on
// dark — inverting the perceived order. Dark stops stay above the card L (~0.26).
function bucketClass(rate: number, hasData: boolean): string {
  if (!hasData) return 'bg-muted/50'
  if (rate >= 0.75) return 'bg-brand-green-500 dark:bg-brand-green-400'
  if (rate >= 0.5) return 'bg-brand-green-300 dark:bg-brand-green-500'
  if (rate >= 0.25) return 'bg-brand-green-200 dark:bg-brand-green-600'
  return 'bg-brand-green-100 dark:bg-brand-green-700'
}

/**
 * A 7-col × 12-row attendance heatmap (day-of-week × week), salvaged from the
 * removed Reports module (ADR-0028). Pure/presentational: it renders whatever
 * daily-rate {@link HeatmapCell}s it is given (see `attendanceHeatmapCells`).
 */
export function AttendanceHeatmap({ data }: AttendanceHeatmapProps) {
  const { t } = useTranslation()
  const { formatDate, formatPercent } = useFormat()

  const cols = 7
  const rows = 12
  const totalCells = cols * rows

  // Pad / trim to exactly 84 cells.
  const cells: HeatmapCell[] = data.slice(-totalCells)
  while (cells.length < totalCells) cells.unshift({ date: '', rate: 0 })

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <div
        role="grid"
        aria-label={t('dashboard.attendanceHeatmap.title')}
        className="grid grid-cols-7 grid-rows-12 gap-[3px]"
      >
        {Array.from({ length: rows }).map((_, rowIdx) =>
          Array.from({ length: cols }).map((__, colIdx) => {
            const flat = rowIdx * cols + colIdx
            const cell = cells[flat] ?? { date: '', rate: 0 }
            const hasDate = cell.date !== ''
            const tooltip = hasDate ? `${formatDate(cell.date)} · ${formatPercent(cell.rate)}` : ''
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                role="gridcell"
                title={tooltip}
                aria-label={tooltip}
                className={`size-4 rounded-[3px] transition-transform hover:scale-110 ${bucketClass(
                  cell.rate,
                  hasDate
                )}`}
                style={{ gridRow: rowIdx + 1, gridColumn: colIdx + 1 }}
              />
            )
          })
        )}
      </div>
      <div className="flex w-full items-center justify-end gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span aria-hidden="true">{t('dashboard.attendanceHeatmap.legendLess')}</span>
        <span
          className="size-2.5 rounded-[2px] bg-brand-green-100 dark:bg-brand-green-700"
          aria-hidden="true"
        />
        <span
          className="size-2.5 rounded-[2px] bg-brand-green-200 dark:bg-brand-green-600"
          aria-hidden="true"
        />
        <span
          className="size-2.5 rounded-[2px] bg-brand-green-300 dark:bg-brand-green-500"
          aria-hidden="true"
        />
        <span
          className="size-2.5 rounded-[2px] bg-brand-green-500 dark:bg-brand-green-400"
          aria-hidden="true"
        />
        <span aria-hidden="true">{t('dashboard.attendanceHeatmap.legendMore')}</span>
      </div>
    </div>
  )
}
