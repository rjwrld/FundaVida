import * as React from 'react'
import { MorphSpan } from '@/components/shared/MorphSpan'
import { cn } from '@/lib/utils'

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  eyebrow?: string
  action?: React.ReactNode
  /**
   * Pairs this heading with the identically-id'd node it was navigated from — the
   * Course list's title link — so framer morphs one into the other (ADR-0047 phase
   * 6c). Callers arm it only for a mount that paints from cache; see
   * `useCourseMorphTarget`, which is the only thing that should be producing this.
   */
  titleLayoutId?: string
}

export function PageHeader({
  title,
  description,
  eyebrow,
  action,
  titleLayoutId,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b pb-6 md:flex-row md:items-end md:justify-between',
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <span className="text-xs font-medium uppercase tracking-wider text-primary">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {titleLayoutId ? <MorphSpan layoutId={titleLayoutId}>{title}</MorphSpan> : title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}
