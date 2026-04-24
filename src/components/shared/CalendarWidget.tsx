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
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [month, setMonth] = React.useState<Date>(selected ?? new Date())

  useEffect(() => {
    if (selected) setMonth(selected)
  }, [selected])

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start, end })

  return (
    <div
      className={cn('rounded-xl border border-border bg-card p-5 shadow-card', className)}
      {...props}
    >
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
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {days.map((day) => {
          const outside = !isSameMonth(day, month)
          const today = isToday(day)
          const isSelected = selected ? isSameDay(day, selected) : false
          const hasEvent = hasEventOn(day, events)
          const weekend = day.getDay() === 0 || day.getDay() === 6

          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-label={format(day, 'EEEE, MMMM d, yyyy')}
              onClick={() => onSelect?.(day)}
              data-has-event={hasEvent ? 'true' : 'false'}
              className={cn(
                'relative flex h-8 w-8 items-center justify-center rounded-md text-[13px] tabular-nums transition-colors',
                outside && 'opacity-30',
                weekend && !today && 'text-muted-foreground',
                !today && !isSelected && 'hover:bg-brand-green-50'
              )}
            >
              {today ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full ring-1 ring-brand-green-500/20"
                />
              ) : null}
              {today ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0.5 rounded-full bg-brand-green-500"
                />
              ) : null}
              {!today && isSelected ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full ring-[1.5px] ring-brand-green-500"
                />
              ) : null}
              <span
                className={cn(
                  'relative z-10',
                  today && 'font-semibold text-[oklch(var(--primary-foreground))]'
                )}
              >
                {format(day, 'd')}
              </span>
              {hasEvent ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute bottom-0.5 left-1/2 size-[5px] -translate-x-1/2 rounded-full',
                    today ? 'bg-[oklch(var(--primary-foreground))]' : 'bg-brand-green-500'
                  )}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
