import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { useFormat } from '@/hooks/useFormat'
import type { AttendanceTrendPoint } from '@/hooks/api/useDashboardStats'

export interface AttendanceSnapshotProps {
  ratePct: number
  trend: AttendanceTrendPoint[]
}

interface TrendDatum {
  index: number
  label: string
  value: number
}

export function AttendanceSnapshot({ ratePct, trend }: AttendanceSnapshotProps) {
  const { t } = useTranslation()
  const { formatPercent } = useFormat()
  const data: TrendDatum[] = trend.map((point, index) => ({
    index,
    label: format(point.day, 'EEE'),
    value: point.count,
  }))

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-card">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">{t('dashboard.attendance.title')}</h3>
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {t('dashboard.attendance.trendLabel')}
        </span>
      </header>
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[40px] font-semibold tabular-nums leading-none text-foreground">
          {formatPercent(ratePct / 100)}
        </p>
        <p className="text-xs text-muted-foreground">{t('dashboard.attendance.rateLabel')}</p>
      </div>
      <div className="mt-4 flex-1 min-h-[80px]">
        <ResponsiveContainer width="100%" height={80}>
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <XAxis dataKey="label" hide />
            <Tooltip
              cursor={{ fill: 'oklch(var(--muted) / 0.4)' }}
              contentStyle={{
                background: 'oklch(var(--card))',
                border: '1px solid oklch(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
                padding: '6px 8px',
              }}
              labelFormatter={(label: string) => label}
            />
            <Bar
              dataKey="value"
              fill="oklch(var(--brand-green-500))"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  )
}
