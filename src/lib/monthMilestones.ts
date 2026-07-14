import { endOfMonth, isSameDay, parseISO, startOfDay, startOfMonth } from 'date-fns'
import type { Course, SessionException } from '@/types'
import { milestoneCourseName } from './courseName'
import { dayAnchor, sessionsFor } from './sessions'

/**
 * The five day-types the month term map narrates (ADR-0048). Sessions derive from
 * Term × Meeting Days (ADR-0001), so a month of a periodic schedule is uniform by
 * construction — density cannot vary. What *does* vary is exactly this: the
 * cohort boundaries, the Session exceptions (ADR-0039), and today (the day
 * picker's own ring). An ordinary Session day carries no milestone — it is the
 * baseline texture the notables replace.
 */
export type MilestoneKind =
  | 'cohortStart'
  | 'cohortEnd'
  | 'cancelled'
  | 'rescheduledFrom'
  | 'rescheduledTo'

/**
 * Glyph priority for same-day stacking, in the ADR's own vocabulary order:
 * boundaries are the term's skeleton, exceptions are deviations inside it. A cell
 * renders at most the first two then a "+", and the milestone list breaks
 * same-day ties the same way, so cell and list never disagree.
 */
const MILESTONE_PRIORITY: readonly MilestoneKind[] = [
  'cohortStart',
  'cohortEnd',
  'cancelled',
  'rescheduledFrom',
  'rescheduledTo',
]

export interface Milestone {
  kind: MilestoneKind
  /** Local-midnight ISO day anchor, matching how `sessionsFor` stamps Sessions. */
  date: string
  courseId: string
  /** The row's display name: Sede kept, cohort period dropped (ADR-0021). */
  courseName: string
  /** The exception's teacher note ("Feriado", …), when it carries one. */
  note?: string
}

function priority(kind: MilestoneKind): number {
  return MILESTONE_PRIORITY.indexOf(kind)
}

function byDayThenPriority(a: Milestone, b: Milestone): number {
  const delta = parseISO(a.date).getTime() - parseISO(b.date).getTime()
  return delta !== 0 ? delta : priority(a.kind) - priority(b.kind)
}

/**
 * Every milestone the scoped Courses and their exceptions carry, ascending by day
 * (same-day ties broken by glyph priority). The single derivation behind the month
 * grid's glyphs, the "This month" list, and the quiet state's nearest-milestone
 * jump — one edit reaches all three.
 *
 * Rides the caller's already-scoped reads: exceptions inherit Course visibility
 * exactly (ADR-0039), so an exception naming a Course outside `courses` is ignored,
 * as `effectiveSessions` ignores it.
 *
 * Truthful by construction — it only ever names days `effectiveSessions` agrees
 * about. A `'cancelled'`/`'rescheduled'` whose `date` matches no base Session, and
 * a `'rescheduled'` with no `newDate`, are both no-ops in the overlay, so they get
 * no glyph here either. `'extra'` deliberately produces no milestone: it *is* an
 * ordinary Session day (the overlay inserts it), and the ADR's vocabulary has no
 * sixth glyph — it shows up as the baseline dot.
 */
export function milestonesFor(courses: Course[], exceptions: SessionException[] = []): Milestone[] {
  const milestones: Milestone[] = []

  for (const course of courses) {
    const courseName = milestoneCourseName(course)
    const start = startOfDay(parseISO(course.term.start))
    const end = startOfDay(parseISO(course.term.end))

    // A malformed or inverted term derives no Sessions (`sessionsFor`), so it
    // draws no boundaries either.
    const hasTerm = !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start
    if (hasTerm) {
      milestones.push(
        { kind: 'cohortStart', date: start.toISOString(), courseId: course.id, courseName },
        { kind: 'cohortEnd', date: end.toISOString(), courseId: course.id, courseName }
      )
    }

    const base = sessionsFor(course)
    const own = exceptions.filter((e) => e.courseId === course.id)

    for (const exception of own) {
      const namesBaseSession = base.some((session) =>
        isSameDay(parseISO(session.date), parseISO(exception.date))
      )
      if (!namesBaseSession) continue

      const at = (kind: MilestoneKind, date: string): Milestone => ({
        kind,
        date: dayAnchor(date),
        courseId: course.id,
        courseName,
        note: exception.note,
      })

      if (exception.type === 'cancelled') {
        milestones.push(at('cancelled', exception.date))
      } else if (exception.type === 'rescheduled' && exception.newDate) {
        milestones.push(
          at('rescheduledFrom', exception.date),
          at('rescheduledTo', exception.newDate)
        )
      }
    }
  }

  return milestones.sort(byDayThenPriority)
}

/** The milestones falling inside the displayed calendar month — the "This month" list. */
export function milestonesInMonth(milestones: Milestone[], month: Date): Milestone[] {
  const first = startOfMonth(month).getTime()
  const last = endOfMonth(month).getTime()

  return milestones.filter((milestone) => {
    const day = startOfDay(parseISO(milestone.date)).getTime()
    return day >= first && day <= last
  })
}

/**
 * The nearest milestone before and after the displayed month — the data behind the
 * quiet state's jump (the ADR-0044 empty-week pattern, applied to months). `prev`
 * is the last milestone strictly before the month, `next` the first strictly after.
 * Either side is `null` at the term map's edge, so the quiet state never dead-ends
 * against a fabricated date.
 */
export function nearestMilestonesAround(
  milestones: Milestone[],
  month: Date
): { prev: Milestone | null; next: Milestone | null } {
  const first = startOfMonth(month).getTime()
  const last = endOfMonth(month).getTime()

  let prev: Milestone | null = null
  let next: Milestone | null = null

  // `milestones` is ascending, so the last one before the month and the first one
  // after it are a single pass away.
  for (const milestone of milestones) {
    const day = startOfDay(parseISO(milestone.date)).getTime()
    if (day < first) prev = milestone
    else if (day > last && !next) next = milestone
  }

  return { prev, next }
}
