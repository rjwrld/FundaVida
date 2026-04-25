import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface Point {
  month: string
  current: number
  prior: number
}

export function EnrollmentTrendChart({ data }: { data: Point[] }) {
  const { t } = useTranslation()
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="reportsGradGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(var(--chart-1))" stopOpacity="0.22" />
            <stop offset="100%" stopColor="oklch(var(--chart-1))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="oklch(var(--border) / 0.6)" />
        <XAxis
          dataKey="month"
          stroke="oklch(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
        />
        <YAxis
          stroke="oklch(var(--muted-foreground))"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fontFamily: 'Geist Mono, monospace' }}
          width={36}
        />
        <Tooltip
          cursor={{
            stroke: 'oklch(var(--brand-green-500))',
            strokeWidth: 1,
            strokeDasharray: '3 3',
          }}
          contentStyle={{
            background: 'oklch(var(--popover))',
            border: '1px solid oklch(var(--border))',
            borderRadius: '10px',
            fontSize: '12px',
            padding: '8px 10px',
            boxShadow: '0 6px 24px -10px oklch(0 0 0 / 0.15)',
          }}
        />
        <Area
          type="monotone"
          dataKey="prior"
          stroke="oklch(var(--chart-2))"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="none"
          name={t('reports.enrollmentTrend.priorYear')}
          isAnimationActive={false}
        />
        <Area
          type="monotone"
          dataKey="current"
          stroke="oklch(var(--chart-1))"
          strokeWidth={2.25}
          fill="url(#reportsGradGreen)"
          name={t('reports.enrollmentTrend.currentYear')}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
