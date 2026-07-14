import { parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFormat } from '@/hooks/useFormat'
import type { Milestone } from '@/lib/monthMilestones'
import { MilestoneGlyph } from './MilestoneGlyph'

export interface MonthMilestonesProps {
  /** The displayed month's milestones, chronological (from `milestonesInMonth`). */
  milestones: Milestone[]
  /** The nearest milestone on each side — the quiet state's jump targets. */
  nearest: { prev: Milestone | null; next: Milestone | null }
  /** The same navigator move a day-tap is: land the week canvas on that week. */
  onSelect: (date: Date) => void
}

/**
 * The month term map's reading layer (ADR-0048): a chronological "This month"
 * list beside the grid — glyph, name, date — where every row performs the same
 * navigator move a day-tap does. It is also the legend: because the rows carry the
 * very same {@link MilestoneGlyph} the cells do, each glyph appears next to its
 * meaning and the surface needs no legend chrome.
 *
 * This is not the day-detail panel ADR-0044 removed — that was "tap a day, see its
 * sessions". This narrates the month's boundaries and deviations, which the week
 * canvas cannot show.
 */
export function MonthMilestones({ milestones, nearest, onSelect }: MonthMilestonesProps) {
  const { t } = useTranslation()

  return (
    <section
      aria-labelledby="month-milestones-title"
      className="flex flex-col gap-3 lg:max-h-[34rem]"
    >
      <h3 id="month-milestones-title" className="text-sm font-semibold">
        {t('calendar.month.milestones.title')}
      </h3>

      {milestones.length > 0 ? (
        // An admin's month can carry two dozen milestones across 24 cohorts. Below
        // `lg` the list follows the grid and rides the page scroll; at `lg+` it caps
        // near the grid's height and scrolls itself, so the card stays governed by
        // the grid instead of trailing a column of whitespace beside it. Every row
        // is a button, so the scroll region is keyboard-reachable.
        <ul className="space-y-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {milestones.map((milestone) => (
            <li key={`${milestone.kind}-${milestone.courseId}-${milestone.date}`}>
              <MilestoneRow milestone={milestone} onSelect={onSelect} />
            </li>
          ))}
        </ul>
      ) : (
        <QuietMonth nearest={nearest} onSelect={onSelect} />
      )}
    </section>
  )
}

/** The row copy: "Inglés Primaria — Linda Vista · starts Jul 6", plus the exception's note. */
function useMilestoneLabel() {
  const { t } = useTranslation()
  const { formatDayMonth } = useFormat()

  return (milestone: Milestone) => {
    const label = t(`calendar.month.milestones.${milestone.kind}`, {
      course: milestone.courseName,
      date: formatDayMonth(milestone.date),
    })
    return milestone.note ? `${label} · ${milestone.note}` : label
  }
}

function MilestoneRow({
  milestone,
  onSelect,
}: {
  milestone: Milestone
  onSelect: (date: Date) => void
}) {
  const label = useMilestoneLabel()

  return (
    <button
      type="button"
      onClick={() => onSelect(parseISO(milestone.date))}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <MilestoneGlyph kind={milestone.kind} />
      <span className="min-w-0">{label(milestone)}</span>
    </button>
  )
}

/**
 * A month with no milestones points somewhere (ADR-0048): it names the nearest
 * milestone in each direction and offers the jump — the ADR-0044 empty-week
 * pattern. Both sides are `null` only at the term map's outer edges, where there
 * is genuinely nothing to point at.
 */
function QuietMonth({
  nearest,
  onSelect,
}: {
  nearest: { prev: Milestone | null; next: Milestone | null }
  onSelect: (date: Date) => void
}) {
  const { t } = useTranslation()
  const label = useMilestoneLabel()
  const { prev, next } = nearest

  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/50 px-4 py-6 text-center">
      <p className="text-sm text-muted-foreground">{t('calendar.month.milestones.empty')}</p>
      <div className="mt-4 flex flex-col items-center gap-3">
        {next ? (
          <NearestJump
            label={t('calendar.month.milestones.emptyNext', { milestone: label(next) })}
            onJump={() => onSelect(parseISO(next.date))}
          />
        ) : null}
        {prev ? (
          <NearestJump
            label={t('calendar.month.milestones.emptyPrev', { milestone: label(prev) })}
            onJump={() => onSelect(parseISO(prev.date))}
          />
        ) : null}
      </div>
    </div>
  )
}

function NearestJump({ label, onJump }: { label: string; onJump: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm text-foreground">{label}</p>
      <Button variant="ghost" size="sm" onClick={onJump} className="text-primary">
        {t('calendar.jumpToWeek')}
        <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
