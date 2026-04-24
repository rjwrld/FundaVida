import * as React from 'react'
import { cn } from '@/lib/utils'

export function SkeletonStatCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading stat"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card',
        className
      )}
      {...props}
    >
      <span className="h-2.5 w-1/2 animate-pulse-soft rounded bg-muted" aria-hidden="true" />
      <span className="h-8 w-2/3 animate-pulse-soft rounded bg-muted/80" aria-hidden="true" />
      <span className="h-2.5 w-1/3 animate-pulse-soft rounded bg-muted/70" aria-hidden="true" />
    </div>
  )
}
