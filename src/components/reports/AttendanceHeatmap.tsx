import { useFormat } from '@/hooks/useFormat'

interface Cell {
  date: string
  rate: number
}

interface AttendanceHeatmapProps {
  data: Cell[]
}

function bucketClass(rate: number, hasData: boolean): string {
  if (!hasData) return 'bg-muted/50'
  if (rate >= 0.75) return 'bg-brand-green-500'
  if (rate >= 0.5) return 'bg-brand-green-200'
  if (rate >= 0.25) return 'bg-flame-yellow-200'
  return 'bg-flame-red-200'
}

export function AttendanceHeatmap({ data }: AttendanceHeatmapProps) {
  const { formatDate, formatPercent } = useFormat()

  // Build a 7-row × 12-col grid (rows = day of week, cols = week index).
  const cellByIndex = data
  const cols = 12
  const rows = 7
  const totalCells = cols * rows

  // Pad / trim to exactly 84 cells.
  const cells: Cell[] = cellByIndex.slice(-totalCells)
  while (cells.length < totalCells) cells.unshift({ date: '', rate: 0 })

  return (
    <div className="flex h-full flex-col gap-3">
      <div
        role="grid"
        aria-label="Attendance heatmap"
        className="grid flex-1 gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, colIdx) =>
          Array.from({ length: rows }).map((__, rowIdx) => {
            const flat = colIdx * rows + rowIdx
            const cell = cells[flat] ?? { date: '', rate: 0 }
            const hasDate = cell.date !== ''
            const tooltip = hasDate ? `${formatDate(cell.date)} · ${formatPercent(cell.rate)}` : ''
            return (
              <div
                key={`${colIdx}-${rowIdx}`}
                role="gridcell"
                title={tooltip}
                aria-label={tooltip}
                className={`aspect-square rounded-[3px] transition-transform hover:scale-110 ${bucketClass(
                  cell.rate,
                  hasDate
                )}`}
                style={{ gridRow: rowIdx + 1, gridColumn: colIdx + 1 }}
              />
            )
          })
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="font-mono">12w</span>
        <div className="flex items-center gap-1.5">
          <span>0%</span>
          <span className="size-2.5 rounded-[2px] bg-flame-red-200" aria-hidden="true" />
          <span className="size-2.5 rounded-[2px] bg-flame-yellow-200" aria-hidden="true" />
          <span className="size-2.5 rounded-[2px] bg-brand-green-200" aria-hidden="true" />
          <span className="size-2.5 rounded-[2px] bg-brand-green-500" aria-hidden="true" />
          <span>100%</span>
        </div>
      </div>
    </div>
  )
}
