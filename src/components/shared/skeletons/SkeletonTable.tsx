import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: number
  columns?: number
}

export function SkeletonTable({ rows = 5, columns = 4, className, ...props }: SkeletonTableProps) {
  return (
    <div
      role="status"
      aria-label="Loading table"
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card shadow-card',
        className
      )}
      {...props}
    >
      <div
        className="grid border-b border-border/60 bg-muted/40 px-4 py-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <span
            key={index}
            className="h-3 w-20 animate-pulse-soft rounded bg-muted"
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="divide-y divide-border/60">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid px-4 py-4"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <span
                key={colIndex}
                className="h-3 w-3/4 animate-pulse-soft rounded bg-muted/70"
                aria-hidden="true"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
