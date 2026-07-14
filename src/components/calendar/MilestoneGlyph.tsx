import { cn } from '@/lib/utils'
import type { MilestoneKind } from '@/lib/monthMilestones'

/**
 * The month term map's glyph vocabulary (ADR-0048). Color stays semantic-only
 * (ADR-0047's two-hue status language): Figure Green marks a cohort start — a
 * legitimate "go" moment, and the only green on the surface — destructive marks a
 * cancellation, and everything else is neutral. A rescheduled Session carries the
 * same neutral dot on both the day it vacated and the day it landed on.
 *
 * One component, rendered identically in the day cell and in the "This month"
 * list, is what lets the list double as the legend: every glyph appears next to
 * its meaning, so the surface needs no legend chrome of its own.
 */
const GLYPH: Record<MilestoneKind, string> = {
  cohortStart: 'bg-success',
  cohortEnd: 'border border-muted-foreground',
  cancelled: 'bg-destructive',
  rescheduledFrom: 'bg-foreground/70',
  rescheduledTo: 'bg-foreground/70',
}

export function MilestoneGlyph({ kind, className }: { kind: MilestoneKind; className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-milestone={kind}
      className={cn('size-1.5 shrink-0 rounded-full', GLYPH[kind], className)}
    />
  )
}

/**
 * The baseline texture: an ordinary Session day. Constant across every in-term
 * weekday, and that is the point — it stops pretending to be signal, and its edge
 * is where the term visibly starts and stops. A notable replaces it on its day.
 */
export function SessionDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-session-dot
      className={cn('size-1 shrink-0 rounded-full bg-muted-foreground/50', className)}
    />
  )
}
