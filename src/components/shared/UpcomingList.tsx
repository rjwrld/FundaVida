import * as React from 'react'
import { cn } from '@/lib/utils'

export interface UpcomingItem {
  id: string
  title: string
  subtitle?: string
}

export interface UpcomingListProps extends React.HTMLAttributes<HTMLUListElement> {
  items: UpcomingItem[]
  emptyLabel?: string
}

export function UpcomingList({
  items,
  emptyLabel = 'Nothing upcoming',
  className,
  ...props
}: UpcomingListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-card/50 px-5 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    )
  }

  return (
    <ul className={cn('flex flex-col divide-y divide-border/60', className)} {...props}>
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-3">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-muted" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
            {item.subtitle ? (
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  )
}
