import * as React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { AnimatedNumber } from './AnimatedNumber'

export type StatCardVariant = 'default' | 'primary'

export interface StatCardDelta {
  value: number
  label?: string
  /** Already-localized words announcing the trend direction to assistive tech. */
  trend?: { up: string; down: string; flat?: string }
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
  // Direction is keyed off the rounded percentage we actually display, so a
  // value that rounds to 0% always reads as flat (no false up/down arrow).
  const deltaRounded = delta ? Math.round(delta.value * 100) : 0
  const direction = deltaRounded > 0 ? 'up' : deltaRounded < 0 ? 'down' : 'flat'
  const deltaPct = delta ? `${Math.abs(deltaRounded)}%` : null
  const trendWord = delta?.trend
    ? direction === 'up'
      ? delta.trend.up
      : direction === 'down'
        ? delta.trend.down
        : delta.trend.flat
    : null

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-lg border border-border p-5 transition-colors hover:border-foreground/30',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <div className="flex min-h-9 items-start justify-between gap-3">
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
          <Badge
            variant={
              direction === 'up' ? 'success' : direction === 'down' ? 'destructive' : 'neutral'
            }
            className="gap-1 tabular-nums"
          >
            {direction === 'up' ? (
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            ) : direction === 'down' ? (
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            ) : (
              <Minus className="size-3.5" aria-hidden="true" />
            )}
            {trendWord ? <span className="sr-only">{trendWord} </span> : null}
            {deltaPct}
          </Badge>
          {delta.label ? <span className="text-muted-foreground">{delta.label}</span> : null}
        </div>
      )}
    </div>
  )
}
