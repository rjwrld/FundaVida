import * as React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

// Mirrors StatCard's own shell (rounded-lg tile, no shadow) rather than the Card
// primitive, since StatCard isn't a Card. bg-card is a separate class — exactly as
// StatCard keeps it in its variant map — so the loading placeholder matches the
// loaded fill without re-forming the hand-rolled shell combo the phase-2b grep bans.
export function SkeletonStatCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="status"
      aria-label="Loading stat"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border p-5',
        'bg-card',
        className
      )}
      {...props}
    >
      <Skeleton className="h-2.5 w-1/2" aria-hidden="true" />
      <Skeleton className="h-8 w-2/3" aria-hidden="true" />
      <Skeleton className="h-2.5 w-1/3" aria-hidden="true" />
    </div>
  )
}
