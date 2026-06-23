import * as React from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedNumber } from './AnimatedNumber'

export type StatCardVariant = 'default' | 'primary'

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
        'group relative overflow-hidden rounded-lg border border-border p-5 transition-colors hover:border-foreground/30',
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
      {delta && (
        <div className="mt-3">
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
        </div>
      )}
    </div>
  )
}
