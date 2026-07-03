import * as React from 'react'
import { useEffect } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { AnimatePresence, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { clock } from '@/lib/clock'
import { scaleIn, transitionDefaults, transitionFast } from '@/lib/motion'
import { cn } from '@/lib/utils'

// Month change: a quiet fade + small x-slide (no bounce). Reuses the app's
// transitionDefaults curve — reduced-motion is handled by the app-level MotionConfig.
const monthGrid: Variants = {
  hidden: { opacity: 0, x: 8 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
}

export interface CalendarWidgetProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'onSelect'
> {
  selected?: Date
  events?: Date[]
  onSelect?: (date: Date) => void
}

const DAY_LABELS = [
  { letter: 'M', full: 'Monday' },
  { letter: 'T', full: 'Tuesday' },
  { letter: 'W', full: 'Wednesday' },
  { letter: 'T', full: 'Thursday' },
  { letter: 'F', full: 'Friday' },
  { letter: 'S', full: 'Saturday' },
  { letter: 'S', full: 'Sunday' },
]

function hasEventOn(day: Date, events: Date[]) {
  return events.some((event) => isSameDay(event, day))
}

export function CalendarWidget({
  selected,
  events = [],
  onSelect,
  className,
  ...props
}: CalendarWidgetProps) {
  const [month, setMonth] = React.useState<Date>(selected ?? clock.today())

  useEffect(() => {
    if (selected) setMonth(selected)
  }, [selected])

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5', className)} {...props}>
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">{format(month, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-brand-green-50 hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-brand-green-50 hover:text-foreground"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-0.5 text-center">
        {DAY_LABELS.map((d, i) => (
          <span
            key={`${d.full}-${i}`}
            aria-label={d.full}
            className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70"
          >
            <span aria-hidden="true">{d.letter}</span>
          </span>
        ))}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={format(month, 'yyyy-MM')}
          variants={monthGrid}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={transitionDefaults}
          className="mt-1 grid grid-cols-7 gap-0.5"
        >
          {days.map((day) => {
            const outside = !isSameMonth(day, month)
            // "Today" is the frozen today (ADR-0014), consistent with the default
            // month above, so the marker stays on the Demo Epoch's timeline.
            const today = isSameDay(day, clock.today())
            const isSelected = selected ? isSameDay(day, selected) : false
            const selectedNotToday = isSelected && !today
            const hasEvent = hasEventOn(day, events)

            return (
              <button
                key={day.toISOString()}
                type="button"
                aria-label={format(day, 'EEEE, MMMM d, yyyy')}
                onClick={() => onSelect?.(day)}
                data-has-event={hasEvent ? 'true' : 'false'}
                data-today={today ? 'true' : undefined}
                data-selected={selectedNotToday ? 'true' : undefined}
                className={cn(
                  'relative flex aspect-square w-full items-center justify-center rounded-md text-[13px] tabular-nums transition-colors',
                  outside && 'opacity-30',
                  !today && !isSelected && 'hover:bg-primary/10'
                )}
              >
                {/* Selected (not today): soft green tint fill that fades/scales in — no ring. */}
                {selectedNotToday ? (
                  <motion.span
                    aria-hidden="true"
                    data-selected-tint
                    variants={scaleIn}
                    initial="hidden"
                    animate="visible"
                    transition={transitionFast}
                    className="absolute inset-0.5 rounded-md bg-primary/10"
                  />
                ) : null}
                <span
                  className={cn(
                    'relative z-10',
                    today && 'font-semibold text-primary',
                    selectedNotToday && 'font-medium text-primary'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {/* Today: green underline bar under the number — no filled circle. */}
                {today ? (
                  <span
                    aria-hidden="true"
                    data-today-bar
                    className="absolute bottom-1 left-1/2 h-0.5 w-3.5 -translate-x-1/2 rounded-full bg-primary"
                  />
                ) : null}
                {/* Events: thin quiet green bar — no dot. Today's own bar already marks it. */}
                {hasEvent && !today ? (
                  <span
                    aria-hidden="true"
                    data-event-bar
                    className="absolute bottom-1 left-1/2 h-0.5 w-2.5 -translate-x-1/2 rounded-full bg-primary/40"
                  />
                ) : null}
              </button>
            )
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
