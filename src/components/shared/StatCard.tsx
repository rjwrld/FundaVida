import * as React from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedNumber } from './AnimatedNumber'

export type StatCardVariant = 'default' | 'primary' | 'flame' | 'blue'

export interface StatCardDelta {
  value: number
  label?: string
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: number
  format?: (value: number) => string
  delta?: StatCardDelta
  icon?: React.ReactNode
  sparkline?: number[]
  variant?: StatCardVariant
}

const variantClasses: Record<StatCardVariant, string> = {
  default: 'bg-card',
  primary:
    'bg-gradient-to-br from-brand-green-50 via-card to-card [--stop:65%] from-0% via-[var(--stop)] to-100%',
  flame: 'bg-gradient-to-br from-flame-yellow-50 via-card to-card from-0% via-[50%] to-100%',
  blue: 'bg-gradient-to-br from-brand-blue-50 via-card to-card from-0% via-[70%] to-100%',
}

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  if (values.length < 2) return null
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * 80
      const y = 24 - ((v - min) / range) * 20
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg width="80" height="24" viewBox="0 0 80 24" aria-hidden>
      <polyline
        fill="none"
        strokeWidth="2"
        stroke={positive ? 'oklch(var(--success))' : 'oklch(var(--destructive))'}
        points={points}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StatCard({
  label,
  value,
  format,
  delta,
  icon,
  sparkline,
  variant = 'default',
  className,
  ...props
}: StatCardProps) {
  const positive = delta ? delta.value > 0 : true
  const deltaPct = delta ? `${(Math.abs(delta.value) * 100).toFixed(0)}%` : null

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border p-5 shadow-card transition-all duration-200',
        'hover:-translate-y-px hover:shadow-elevated',
        'before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/40',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div className="mt-3">
        <AnimatedNumber
          value={value}
          format={format}
          className="font-mono text-[32px] font-semibold tabular-nums text-foreground"
        />
      </div>
      {(delta || sparkline) && (
        <div className="mt-3 flex items-end justify-between gap-3">
          {delta ? (
            <div
              className={cn(
                'inline-flex items-center gap-1 text-[13px]',
                positive ? 'text-success' : 'text-destructive'
              )}
            >
              {positive ? (
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="size-3.5" aria-hidden="true" />
              )}
              <span className="font-medium tabular-nums">{deltaPct}</span>
              {delta.label ? <span className="text-muted-foreground">{delta.label}</span> : null}
            </div>
          ) : (
            <span />
          )}
          {sparkline ? (
            <div className="opacity-70 transition-opacity duration-200 group-hover:opacity-100">
              <Sparkline values={sparkline} positive={positive} />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
