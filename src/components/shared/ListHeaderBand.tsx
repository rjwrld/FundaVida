interface ListHeaderBandProps {
  /** Section label, rendered uppercase. */
  label: string
  /** Trailing item count, right-aligned in a tabular mono style. */
  count: number
}

/**
 * The decorative caption bar that sits above a list table — a label on the left
 * and the row count on the right. Purely presentational and `aria-hidden`, since
 * the table below carries the real semantics; extracted so the three list pages
 * that use it (browse courses, teachers, TCU) share one definition.
 */
export function ListHeaderBand({ label, count }: ListHeaderBandProps) {
  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
      aria-hidden="true"
    >
      <span>{label}</span>
      <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
    </div>
  )
}
