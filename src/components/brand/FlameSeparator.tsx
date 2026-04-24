import * as React from 'react'
import { cn } from '@/lib/utils'
import { FlameHope } from '@/components/icons/flame'

export interface FlameSeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string
}

export function FlameSeparator({ label, className, ...props }: FlameSeparatorProps) {
  return (
    <div
      role="separator"
      aria-label={label ?? 'section break'}
      className={cn('flex items-center gap-3 text-muted-foreground', className)}
      {...props}
    >
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
      <FlameHope className="size-4 text-brand-green-500" />
      {label ? (
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </span>
      ) : null}
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )
}
