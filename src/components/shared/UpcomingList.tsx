import * as React from 'react'
import { cn } from '@/lib/utils'

export type UpcomingVariant = 'info' | 'warning' | 'success' | 'neutral'

export interface UpcomingItem {
  id: string
  title: string
  subtitle?: string
  variant?: UpcomingVariant
  icon?: React.ReactNode
}

export interface UpcomingListProps extends React.HTMLAttributes<HTMLUListElement> {
  items: UpcomingItem[]
  emptyLabel?: string
}

const variantClasses: Record<UpcomingVariant, string> = {
  info: 'text-brand-blue-500 bg-brand-blue-50',
  warning: 'text-flame-yellow-600 bg-flame-yellow-50',
  success: 'text-brand-green-500 bg-brand-green-50',
  neutral: 'text-muted-foreground bg-muted',
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
      {items.map((item) => {
        const variant = item.variant ?? 'neutral'
        return (
          <li key={item.id} className="flex items-center gap-3 py-3">
            {item.icon ? (
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-full',
                  variantClasses[variant]
                )}
              >
                {item.icon}
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={cn('size-1.5 shrink-0 rounded-full', variantClasses[variant])}
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
              {item.subtitle ? (
                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
