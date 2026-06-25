import * as React from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AnimatedNumber } from './AnimatedNumber'

export type StatCardVariant = 'default' | 'primary'

export interface StatCardDelta {
  value: number
  label?: string
  /** Already-localized words announcing the trend direction to assistive tech. */
  trend?: { up: string; down: string }
}

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: number
  format?: (value: number) => string
  delta?: StatCardDelta
  icon?: React.ReactNode
  variant?: StatCardVariant
}

const variantClasses: Record<StatCardVariant, string> = {
  default: 'bg-card',
  primary: 'bg-card',
}

export function StatCard({
  label,
  value,
  format,
  delta,
  icon,
  variant = 'default',
  className,
  ...props
}: StatCardProps) {
  const positive = delta ? delta.value > 0 : true
  const deltaPct = delta ? `${(Math.abs(delta.value) * 100).toFixed(0)}%` : null

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-lg border border-border p-5 transition-colors hover:border-foreground/30',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <div className="flex min-h-[2.25rem] items-start justify-between gap-3">
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
      {delta && (
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-4 text-[13px]">
          <Badge variant={positive ? 'success' : 'destructive'} className="gap-1 tabular-nums">
            {positive ? (
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            )}
            {delta.trend ? (
              <span className="sr-only">{positive ? delta.trend.up : delta.trend.down} </span>
            ) : null}
            {deltaPct}
          </Badge>
          {delta.label ? <span className="text-muted-foreground">{delta.label}</span> : null}
        </div>
      )}
    </div>
  )
}
