import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
}

export function SkeletonCard({ lines = 3, className, ...props }: SkeletonCardProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-card',
        className
      )}
      {...props}
    >
      <span className="h-4 w-1/3 animate-pulse-soft rounded bg-muted" aria-hidden="true" />
      {Array.from({ length: lines }).map((_, index) => (
        <span
          key={index}
          className={cn(
            'h-3 animate-pulse-soft rounded bg-muted/70',
            index === lines - 1 ? 'w-2/3' : 'w-full'
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
