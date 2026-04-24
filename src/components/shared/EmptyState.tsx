import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyStateAction {
  label: string
  onClick?: () => void
}

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: string
  body: string
  illustration?: React.ReactNode
  action?: EmptyStateAction
}

export function EmptyState({
  heading,
  body,
  illustration,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center rounded-xl border-[1.5px] border-dashed border-border/60',
        'bg-[radial-gradient(ellipse_at_top,oklch(var(--brand-green-50)/0.4)_0%,transparent_60%)]',
        'px-6 pb-12 pt-14 text-center',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute right-4 top-4 size-1 rounded-full bg-brand-green-500"
      />
      {illustration ? (
        <div className="mb-3 flex max-w-[200px] items-center justify-center">{illustration}</div>
      ) : null}
      <h3 className="font-display text-[28px] leading-tight text-foreground">{heading}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{body}</p>
      {action ? (
        <div className="mt-5">
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
