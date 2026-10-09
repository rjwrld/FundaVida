import * as React from 'react'
import { MorphSpan } from '@/components/shared/MorphSpan'
import { cn } from '@/lib/utils'

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  eyebrow?: string
  /** One line of facts under the title (a detail page's Campus · Teacher · state). */
  meta?: React.ReactNode
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
  meta,
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
        {meta ?? null}
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {/* Wraps on narrow screens: a detail page can carry four actions, which
          in one unbreakable row pushed the page wider than a phone. */}
      {action ? (
        <div className="flex flex-wrap items-center gap-2 md:shrink-0">{action}</div>
      ) : null}
    </div>
  )
}
