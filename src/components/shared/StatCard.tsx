import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card, CardDescription, CardHeader } from '@/components/ui/card'
import { AnimatedNumber } from './AnimatedNumber'

export interface StatCardProps extends React.ComponentProps<typeof Card> {
  label: string
  value: number
  format?: (value: number) => string
}

/**
 * The registry's stat-card composition (ADR-0047 phase 5a, dashboard-01's
 * SectionCards), reduced to the honest part: the label as CardDescription and
 * the value as the big tabular figure. No trend chip and no tinted gradient —
 * both were decoration on a demo whose history is seeded (ADR-0050). The value
 * is deliberately NOT a CardTitle — a bare number makes a meaningless heading,
 * and the card's accessible name is the label above it.
 */
export function StatCard({ label, value, format, className, ...props }: StatCardProps) {
  return (
    <Card className={cn('@container/card h-full', className)} {...props}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <AnimatedNumber
          value={value}
          format={format}
          className="text-2xl font-semibold text-foreground tabular-nums @[250px]/card:text-3xl"
        />
      </CardHeader>
    </Card>
  )
}
