import * as React from 'react'
import { format, parseISO } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { AnimatePresence, motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { getDefaultClassNames, useDayPicker } from 'react-day-picker'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { useFormat } from '@/hooks/useFormat'
import { clock } from '@/lib/clock'
import { transitionDefaults } from '@/lib/motion'
import type { Milestone } from '@/lib/monthMilestones'
import { cn } from '@/lib/utils'
import { MilestoneGlyph, SessionDot } from './MilestoneGlyph'

// Month change: a quiet fade + small x-slide (no bounce). Reuses the app's
// transitionDefaults curve — reduced-motion is handled by the app-level MotionConfig.
const monthGrid: Variants = {
  hidden: { opacity: 0, x: 8 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -8 },
}

const DAY_KEY = 'yyyy-MM-dd'

/** The most glyphs a cell renders before it collapses the rest into a "+". */
const MAX_GLYPHS = 2

interface MonthMarks {
  /** Day → its notable milestones, in glyph priority order. Keyed by `DAY_KEY`. */
  milestones: ReadonlyMap<string, Milestone[]>
  /** The days carrying an ordinary Session — the baseline dots. */
  sessionDays: ReadonlySet<string>
}

const MonthMarksContext = React.createContext<MonthMarks>({
  milestones: new Map(),
  sessionDays: new Set(),
})

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

/**
 * A day cell of the term map (ADR-0048). An ordinary Session day carries the
 * baseline dot; a notable *replaces* it — a day is either narrating a deviation
 * or it is just another day of the term, never both. Three or more notables
 * render two glyphs and a "+", never a pile: the names live in the reading layer
 * beside the grid, and the cell stays glyph-only.
 */
function TermMapDayButton({
  className,
  day,
  modifiers,
  children,
  ...props
}: React.ComponentProps<typeof CalendarDayButton>) {
  const marks = React.useContext(MonthMarksContext)
  const key = format(day.date, DAY_KEY)
  const notables = marks.milestones.get(key) ?? []
  const hasSession = marks.sessionDays.has(key)

  return (
    <CalendarDayButton
      day={day}
      modifiers={modifiers}
      // The registry cell dims its `<span>` children — that treatment is for a
      // secondary label, not for the glyphs.
      className={cn('relative [&>span]:opacity-100', className)}
      {...props}
    >
      {children}
      <span className="absolute inset-x-0 bottom-1 flex items-center justify-center gap-0.5">
        {notables.length > 0 ? (
          <>
            {notables.slice(0, MAX_GLYPHS).map((milestone) => (
              <MilestoneGlyph
                key={`${milestone.kind}-${milestone.courseId}`}
                kind={milestone.kind}
              />
            ))}
            {notables.length > MAX_GLYPHS ? (
              <span
                aria-hidden="true"
                data-milestone-overflow
                className="text-[0.5rem] font-medium leading-none text-muted-foreground"
              >
                +
              </span>
            ) : null}
          </>
        ) : hasSession ? (
          <SessionDot />
        ) : null}
      </span>
    </CalendarDayButton>
  )
}

const MONTH_COMPONENTS = {
  CaptionLabel: MonthHeading,
  MonthGrid: AnimatedMonthGrid,
  DayButton: TermMapDayButton,
}

export interface MonthNavigatorProps {
  /** One Date per scoped effective Session — the baseline texture. Repeats are ignored. */
  sessionDays?: Date[]
  /** The month's notables (ADR-0048); each replaces the baseline dot on its day. */
  milestones?: Milestone[]
  /** The displayed month. Controlled by the caller, which reads it for the milestone list. */
  month?: Date
  onMonthChange?: (month: Date) => void
  /** A day tap is a navigator move — the caller decides where it lands. */
  onSelect?: (date: Date) => void
  className?: string
}

/**
 * The month view of the calendar: a **term map**, not a density plot (ADR-0048).
 * Sessions derive from Term × Meeting Days (ADR-0001), so every in-term weekday
 * carries one — a density scale over that has no shape to reveal. The grid instead
 * narrates what actually varies across a month: the cohort boundaries, the Session
 * exceptions, and today. It stays a navigator (ADR-0044) — a day tap lands the week
 * canvas on that week, and no day-detail panel returns.
 *
 * Built on the registry `ui/calendar` (react-day-picker), which owns the grid
 * semantics, roving focus, and keyboard navigation; this adds the glyphs, the
 * month-change motion, and the ES/EN localization.
 */
export function MonthNavigator({
  sessionDays = [],
  milestones = [],
  month,
  onMonthChange,
  onSelect,
  className,
}: MonthNavigatorProps) {
  const defaultClassNames = getDefaultClassNames()
  const { t } = useTranslation()
  const { locale } = useFormat()
  const dfLocale = locale === 'es' ? es : enUS

  // `milestonesFor` already sorts by day then glyph priority, so bucketing by day
  // preserves the priority order the cell slices its first two glyphs from.
  const marks = React.useMemo<MonthMarks>(() => {
    const byDay = new Map<string, Milestone[]>()
    for (const milestone of milestones) {
      const key = format(parseISO(milestone.date), DAY_KEY)
      const day = byDay.get(key)
      if (day) day.push(milestone)
      else byDay.set(key, [milestone])
    }
    return {
      milestones: byDay,
      sessionDays: new Set(sessionDays.map((date) => format(date, DAY_KEY))),
    }
  }, [milestones, sessionDays])

  // "Today" is the frozen today (ADR-0014), so the marker stays on the Demo
  // Epoch's timeline instead of drifting to wall-clock time.
  const today = clock.today()

  return (
    <MonthMarksContext.Provider value={marks}>
      <Calendar
        className={className}
        // The registry sizes its root `w-fit` for a popover; here the calendar is
        // the page's hero. Overriding `root` drops the registry's own class, so
        // re-attach the `rdp-root` hook its RTL/animation selectors key off.
        classNames={{ root: cn('w-full', defaultClassNames.root) }}
        today={today}
        month={month}
        defaultMonth={today}
        onMonthChange={onMonthChange}
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
    </MonthMarksContext.Provider>
  )
}
