import { Children, useId, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

export interface WorklistCardProps {
  title: string
  icon: LucideIcon
  /** Pending items; the header badge shows only when there is work (> 0). */
  count?: number
  /** A header control beside the count (e.g. the announcements Post button). */
  action?: ReactNode
  /** Copy for the compact empty state, shown when there are no rows. */
  emptyLabel: string
  /** Footer link onward to where the full list lives. */
  viewAll?: { to: string; label: string }
  /**
   * Rows ({@link WorklistRow}s) — or, for a table-backed queue, the table itself
   * via `body`. With neither, the card shows its empty state.
   */
  children?: ReactNode
  /** Non-list content (a DataTable) rendered in place of the row list. */
  body?: ReactNode
  className?: string
  'data-testid'?: string
}

/**
 * The one dashboard card shape (ADR-0050): an h3 title with its icon on the
 * left, the pending count in the header's action slot, rows from
 * {@link WorklistRow}, a compact {@link WorklistEmpty} when there is nothing to
 * do, and an optional "View all" footer link. The card is a region named by its
 * title, so a screen reader (and an e2e locator) can jump straight to it.
 */
export function WorklistCard({
  title,
  icon: Icon,
  count,
  action,
  emptyLabel,
  viewAll,
  children,
  body,
  className,
  'data-testid': testId,
}: WorklistCardProps) {
  const headingId = useId()
  const hasRows = Children.toArray(children).length > 0
  const showCount = count !== undefined && count > 0

  return (
    <Card
      role="region"
      aria-labelledby={headingId}
      className={cn('h-full', className)}
      data-testid={testId}
    >
      <CardHeader>
        <CardTitle as="h3" id={headingId} className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          {title}
        </CardTitle>
        {(showCount || action) && (
          <CardAction className="flex items-center gap-2">
            {showCount && (
              <Badge variant="secondary" className="tabular-nums">
                {count}
              </Badge>
            )}
            {action}
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {body ??
          (hasRows ? (
            <ul className="flex flex-1 flex-col divide-y divide-border/60">{children}</ul>
          ) : (
            <WorklistEmpty icon={Icon} label={emptyLabel} />
          ))}
      </CardContent>
      {viewAll && (
        <CardFooter>
          <Button variant="link" size="sm" asChild className="h-auto px-0 has-[>svg]:px-0">
            <Link to={viewAll.to}>
              {viewAll.label}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

/**
 * Caps a queue on a surface that is not its home (the admin dashboard): show the
 * `rows` longest-waiting items and link to `viewAllTo`, the queue's full page.
 */
export interface WorklistLimit {
  rows: number
  viewAllTo: string
}

export interface WorklistRowProps {
  to: string
  /** The row's name — also the link's accessible name. */
  title: ReactNode
  /** One muted line under the title (e.g. "Session 3 · Oct 6"). */
  subtitle?: ReactNode
  /** Longer muted text under the subtitle, clamped to two lines. */
  body?: ReactNode
  /** Badges or a short readout on the right. */
  trailing?: ReactNode
  /** At most one button — only for work that is due now (ADR-0050). */
  action?: ReactNode
}

/**
 * One worklist row. The whole row is the link (a stretched `::after` over the
 * row), so the hit area is the row and the accessible name is just the title;
 * the optional action sits above that overlay as a sibling of the link, never
 * nested inside it.
 */
export function WorklistRow({ to, title, subtitle, body, trailing, action }: WorklistRowProps) {
  return (
    // Wraps rather than truncating the title to nothing: long trailing badges
    // (a Course's close blockers) drop under the title in a narrow card.
    <li className="relative flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 first:pt-0 last:pb-0">
      <div className="min-w-[min(100%,14rem)] flex-1">
        <Link
          to={to}
          className="block truncate text-sm font-medium text-foreground outline-none after:absolute after:inset-0 after:rounded-md hover:text-primary hover:underline focus-visible:after:ring-2 focus-visible:after:ring-ring"
        >
          {title}
        </Link>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
        {body && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{body}</p>}
      </div>
      {trailing && <div className="flex shrink-0 flex-wrap justify-end gap-1">{trailing}</div>}
      {action && <div className="relative z-10 shrink-0">{action}</div>}
    </li>
  )
}

/**
 * The compact in-card empty state every dashboard card and approval queue
 * shares (ADR-0050): the card's icon over one line of copy, padded small so an
 * empty card stays short. `NoResults` stays for filtered lists.
 */
export function WorklistEmpty({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <Empty className="gap-2 p-2 md:p-2">
      <EmptyHeader className="gap-1.5">
        <EmptyMedia variant="icon" className="mb-0 size-8">
          <Icon className="size-4" aria-hidden="true" />
        </EmptyMedia>
        <EmptyDescription>{label}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
