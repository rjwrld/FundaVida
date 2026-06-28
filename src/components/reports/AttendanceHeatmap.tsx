import { useTranslation } from 'react-i18next'
import { useFormat } from '@/hooks/useFormat'

interface Cell {
  date: string
  rate: number
}

interface AttendanceHeatmapProps {
  data: Cell[]
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

export function AttendanceHeatmap({ data }: AttendanceHeatmapProps) {
  const { t } = useTranslation()
  const { formatDate, formatPercent } = useFormat()

  // Build a 7-col × 12-row grid (cols = day of week, rows = week index).
  const cols = 7
  const rows = 12
  const totalCells = cols * rows

  // Pad / trim to exactly 84 cells.
  const cells: Cell[] = data.slice(-totalCells)
  while (cells.length < totalCells) cells.unshift({ date: '', rate: 0 })

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <div
        role="grid"
        aria-label={t('reports.attendanceHeatmap.title')}
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
      <div className="flex w-full items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="font-mono" aria-hidden="true">
          12w
        </span>
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true">0%</span>
          <span className="size-2.5 rounded-[2px] bg-brand-green-100 dark:bg-brand-green-700">
            <span className="sr-only">{t('reports.attendanceHeatmap.legend.low')}</span>
          </span>
          <span className="size-2.5 rounded-[2px] bg-brand-green-200 dark:bg-brand-green-600">
            <span className="sr-only">{t('reports.attendanceHeatmap.legend.midLow')}</span>
          </span>
          <span className="size-2.5 rounded-[2px] bg-brand-green-300 dark:bg-brand-green-500">
            <span className="sr-only">{t('reports.attendanceHeatmap.legend.midHigh')}</span>
          </span>
          <span className="size-2.5 rounded-[2px] bg-brand-green-500 dark:bg-brand-green-400">
            <span className="sr-only">{t('reports.attendanceHeatmap.legend.high')}</span>
          </span>
          <span aria-hidden="true">100%</span>
        </div>
      </div>
    </div>
  )
}
