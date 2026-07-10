import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function SkeletonStatCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading stat"
      className={cn('flex flex-col gap-3 rounded-xl border border-border bg-card p-5', className)}
      {...props}
    >
      <Skeleton className="h-2.5 w-1/2" aria-hidden="true" />
      <Skeleton className="h-8 w-2/3" aria-hidden="true" />
      <Skeleton className="h-2.5 w-1/3" aria-hidden="true" />
    </div>
  )
}
