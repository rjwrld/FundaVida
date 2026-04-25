import { useTranslation } from 'react-i18next'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { useFormat } from '@/hooks/useFormat'

interface AverageGradeDonutProps {
  average: number | null
}

export function AverageGradeDonut({ average }: AverageGradeDonutProps) {
  const { t } = useTranslation()
  const { formatGrade } = useFormat()

  const value = average ?? 0
  const data = [
    { name: 'avg', value },
    { name: 'rest', value: Math.max(0, 100 - value) },
  ]

  return (
    <div className="relative flex h-full min-h-[200px] items-center justify-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius="68%"
            outerRadius="92%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            <Cell fill="oklch(var(--chart-1))" />
            <Cell fill="oklch(var(--muted))" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[42px] font-semibold tabular-nums leading-none text-foreground">
          {average === null ? '—' : formatGrade(average)}
        </span>
        <span className="mt-1.5 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {t('reports.averageGrade.caption')}
        </span>
      </div>
    </div>
  )
}
