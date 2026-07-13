import * as React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardDescription, CardFooter, CardHeader } from '@/components/ui/card'
import { AnimatedNumber } from './AnimatedNumber'

export interface StatCardDelta {
  value: number
  label?: string
  /** Already-localized words announcing the trend direction to assistive tech. */
  trend?: { up: string; down: string; flat?: string }
}

export interface StatCardProps extends React.ComponentProps<typeof Card> {
  label: string
  value: number
  format?: (value: number) => string
  delta?: StatCardDelta
}

/**
 * The registry's stat-card composition (ADR-0047 phase 5a, dashboard-01's
 * SectionCards): label as CardDescription, the value as the big tabular figure,
 * and the trend Badge in CardAction. The value is deliberately NOT a CardTitle —
 * a bare number makes a meaningless heading, and the card's accessible name is
 * the label above it.
 */
export function StatCard({ label, value, format, delta, className, ...props }: StatCardProps) {
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
    <Card
      className={cn(
        '@container/card h-full bg-gradient-to-t from-primary/5 to-card dark:bg-card',
        className
      )}
      {...props}
    >
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <AnimatedNumber
          value={value}
          format={format}
          className="text-2xl font-semibold text-foreground tabular-nums @[250px]/card:text-3xl"
        />
        {delta && (
          <CardAction>
            <Badge
              variant={
                direction === 'up' ? 'success' : direction === 'down' ? 'destructive' : 'neutral'
              }
              className="tabular-nums"
            >
              {direction === 'up' ? (
                <ArrowUpRight aria-hidden="true" />
              ) : direction === 'down' ? (
                <ArrowDownRight aria-hidden="true" />
              ) : (
                <Minus aria-hidden="true" />
              )}
              {trendWord ? <span className="sr-only">{trendWord} </span> : null}
              {deltaPct}
            </Badge>
          </CardAction>
        )}
      </CardHeader>
      {delta?.label && (
        <CardFooter className="mt-auto text-sm text-muted-foreground">{delta.label}</CardFooter>
      )}
    </Card>
  )
}
