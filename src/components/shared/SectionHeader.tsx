import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface SectionHeaderProps {
  title: string
  /** The heading's id, for a section that names itself with `aria-labelledby`. */
  id?: string
  /** A short readout on the right ("3 issued", "14 recorded · 0 need attendance"). */
  count?: ReactNode
  /** The section's own control(s), right-aligned after the count. */
  action?: ReactNode
  /** A smaller heading for a section that sits inside a compact card. */
  compact?: boolean
  className?: string
}

/**
 * The one section heading on detail pages (ADR-0051): an unboxed h2 on the left,
 * an optional muted count and the section's action on the right. Key-value panels
 * (Identity, Guardian) stay Cards; everything that lists rows opens with this.
 */
export function SectionHeader({
  title,
  id,
  count,
  action,
  compact,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-x-3 gap-y-2', className)}>
      <h2
        id={id}
        className={cn(
          'font-semibold tracking-tight text-foreground',
          compact ? 'text-sm' : 'text-lg'
        )}
      >
        {title}
      </h2>
      {(count !== undefined || action) && (
        <div className="flex flex-wrap items-center gap-3">
          {count !== undefined && (
            <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
          )}
          {action}
        </div>
      )}
    </div>
  )
}
