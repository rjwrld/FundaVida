import * as React from 'react'
import { format } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { getDefaultClassNames, useDayPicker } from 'react-day-picker'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { useFormat } from '@/hooks/useFormat'
import { clock } from '@/lib/clock'
import { transitionDefaults } from '@/lib/motion'
import { cn } from '@/lib/utils'

// Month change: a quiet fade + small x-slide (no bounce). Reuses the app's
// transitionDefaults curve — reduced-motion is handled by the app-level MotionConfig.
const monthGrid: Variants = {
  hidden: { opacity: 0, x: 8 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
}

const DAY_KEY = 'yyyy-MM-dd'

/** Day → number of scoped Sessions on it, keyed by `DAY_KEY`. */
const EventCountsContext = React.createContext<ReadonlyMap<string, number>>(new Map())

// The month is a navigator (ADR-0044): an event mark widens with the day's
// Session count so the term's shape is legible at arm's length. Capped at 4 so
// a heavy day never overruns the cell.
const EVENT_BAR_WIDTH = ['w-1.5', 'w-2.5', 'w-3.5', 'w-4'] as const
function eventBarWidth(count: number) {
  return EVENT_BAR_WIDTH[Math.min(count, EVENT_BAR_WIDTH.length) - 1]
}

/**
 * The month caption as a heading. DayPicker ships it as a `role="status"` span,
 * which announces month changes but erases the heading the surface is navigated
 * by; `aria-live` + `aria-atomic` on an `<h2>` keeps both. `h2` and not `h3`:
 * the navigator sits directly under the page's `h1` (axe `heading-order`).
 */
function MonthHeading({
  role: _role,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 aria-live="polite" aria-atomic="true" {...props}>
      {children}
    </h2>
  )
}

/**
 * The month grid, re-keyed on the displayed month so a month change fades the old
 * grid out and slides the new one in. Keyed here rather than around the whole
 * calendar so the nav buttons and the caption's live region survive the swap;
 * `mode="wait"` keeps exactly one `role="grid"` in the tree, and DayPicker
 * re-focuses the roving day once the incoming grid mounts.
 */
function AnimatedMonthGrid({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'table'>) {
  const { months } = useDayPicker()
  const key = months[0] ? format(months[0].date, 'yyyy-MM') : ''

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.table
        key={key}
        role={props.role}
        aria-label={props['aria-label']}
        aria-multiselectable={props['aria-multiselectable']}
        className={className}
        style={style}
        variants={monthGrid}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={transitionDefaults}
      >
        {children}
      </motion.table>
    </AnimatePresence>
  )
}

/** A day cell carrying its Session-density mark under the date. */
function DensityDayButton({
  className,
  day,
  modifiers,
  children,
  ...props
}: React.ComponentProps<typeof CalendarDayButton>) {
  const eventCounts = React.useContext(EventCountsContext)
  const count = eventCounts.get(format(day.date, DAY_KEY)) ?? 0

  return (
    <CalendarDayButton
      day={day}
      modifiers={modifiers}
      // The registry cell dims its `<span>` children — that treatment is for a
      // secondary label, not for the density mark.
      className={cn('relative [&>span]:opacity-100', className)}
      {...props}
    >
      {children}
      {count > 0 ? (
        <span
          aria-hidden="true"
          data-event-bar
          data-event-count={count}
          className={cn(
            'absolute bottom-1 left-1/2 h-0.5 -translate-x-1/2 rounded-full bg-primary/70',
            eventBarWidth(count)
          )}
        />
      ) : null}
    </CalendarDayButton>
  )
}

const MONTH_COMPONENTS = {
  CaptionLabel: MonthHeading,
  MonthGrid: AnimatedMonthGrid,
  DayButton: DensityDayButton,
}

export interface MonthNavigatorProps {
  /** One Date per scoped Session; repeats on a day widen that day's mark. */
  events?: Date[]
  /** A day tap is a navigator move — the caller decides where it lands. */
  onSelect?: (date: Date) => void
  className?: string
}

/**
 * The month view of the calendar (ADR-0044): a navigator, not a second detail
 * surface. Built on the registry `ui/calendar` (react-day-picker), which owns
 * the grid semantics, roving focus, and keyboard navigation; this adds the
 * Session-density marks, the month-change motion, and the ES/EN localization.
 */
export function MonthNavigator({ events = [], onSelect, className }: MonthNavigatorProps) {
  const defaultClassNames = getDefaultClassNames()
  const { t } = useTranslation()
  const { locale } = useFormat()
  const dfLocale = locale === 'es' ? es : enUS

  const eventCounts = React.useMemo(() => {
    const counts = new Map<string, number>()
    for (const event of events) {
      const key = format(event, DAY_KEY)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return counts
  }, [events])

  // "Today" is the frozen today (ADR-0014), so the marker stays on the Demo
  // Epoch's timeline instead of drifting to wall-clock time.
  const today = clock.today()

  return (
    <EventCountsContext.Provider value={eventCounts}>
      <Calendar
        className={className}
        // The registry sizes its root `w-fit` for a popover; here the calendar is
        // the page's hero. Overriding `root` drops the registry's own class, so
        // re-attach the `rdp-root` hook its RTL/animation selectors key off.
        classNames={{ root: cn('w-full', defaultClassNames.root) }}
        today={today}
        defaultMonth={today}
        weekStartsOn={1}
        locale={dfLocale}
        labels={{
          labelPrevious: () => t('calendar.month.previous'),
          labelNext: () => t('calendar.month.next'),
          labelDayButton: (date, modifiers) => {
            const label = format(date, 'PPPP', { locale: dfLocale })
            return modifiers.today ? t('calendar.month.todayLabel', { date: label }) : label
          },
        }}
        components={MONTH_COMPONENTS}
        onDayClick={(day) => onSelect?.(day)}
      />
    </EventCountsContext.Provider>
  )
}
