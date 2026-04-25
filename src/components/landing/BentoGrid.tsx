import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid auto-rows-[16rem] grid-cols-1 gap-4 md:grid-cols-2', className)}>
      {children}
    </div>
  )
}

export function BentoCell({
  children,
  className,
  span = 1,
}: {
  children: ReactNode
  className?: string
  span?: 1 | 2
}) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-elevated',
        span === 2 && 'md:col-span-2',
        className
      )}
    >
      {children}
    </div>
  )
}
