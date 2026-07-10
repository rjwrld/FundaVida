import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
}

export function SkeletonCard({ lines = 3, className, ...props }: SkeletonCardProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-5', className)}
      {...props}
    >
      <Skeleton className="h-4 w-1/3" aria-hidden="true" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn('h-3', index === lines - 1 ? 'w-2/3' : 'w-full')}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
