import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardFooter, CardHeader } from '@/components/ui/card'

// Mirrors StatCard's stock composition (label row, big value, footer line) so
// resolving a gate swaps skeleton for content without shifting the layout.
export function SkeletonStatCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { t } = useTranslation()
  return (
    <Card role="status" aria-label={t('common.a11y.loadingStat')} className={className} {...props}>
      <CardHeader>
        <Skeleton className="h-4 w-1/2" aria-hidden="true" />
        <Skeleton className="h-8 w-2/3" aria-hidden="true" />
      </CardHeader>
      <CardFooter className="mt-auto">
        <Skeleton className="h-4 w-1/3" aria-hidden="true" />
      </CardFooter>
    </Card>
  )
}
