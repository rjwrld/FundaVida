import * as React from 'react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  eyebrow?: string
  action?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border/60 pb-6 md:flex-row md:items-end md:justify-between',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <span className="text-[12px] font-medium uppercase tracking-wider text-brand-green-700">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="font-display text-3xl text-foreground md:text-4xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}
