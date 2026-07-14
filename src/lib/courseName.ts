import type { Course } from '@/types'

/**
 * The Course name with its `— {Sede}` segment removed, for surfaces that already
 * show the Sede right next to it (the courses table's Campus column, the detail
 * page's overview card, the Sede-grouped enrollments list). The canonical
 * `course.name` keeps the Sede so it stays unique in Sede-less surfaces such as
 * the admin course filters and report charts (ADR-0021). Teacher-authored names
 * that carry no `— {Sede}` segment are returned unchanged.
 */
export function shortCourseName(course: Pick<Course, 'name' | 'sede'>): string {
  return course.name.replace(` — ${course.sede}`, '')
}

/**
 * Drop the trailing "({mon yyyy})" cohort period the seed appends
 * (`… — {Sede} ({mon yyyy})`). Teacher-authored names without one pass through
 * unchanged.
 */
function dropCohortPeriod(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '').trim()
}

/**
 * The calendar card's title: {@link shortCourseName} with the trailing
 * "({mon yyyy})" cohort period also dropped (ADR-0044). A calendar already
 * communicates *when*, so the card spends its two lines on the Program + Level
 * and lets the tooltip / accessible name carry the full canonical name.
 * `shortCourseName` is untouched — other surfaces still want the Sede-stripped
 * name *with* the period.
 */
export function calendarCardName(course: Pick<Course, 'name' | 'sede'>): string {
  return dropCohortPeriod(shortCourseName(course))
}

/**
 * The month term map's milestone-row name (ADR-0048): the cohort period dropped,
 * the Sede **kept** — "Inglés Primaria — Linda Vista · starts Jul 6". The list
 * shows no Sede column of its own, and stripping it collides the seeded cohorts
 * into a handful of identical labels (ADR-0021 permits the strip only where the
 * Sede is already on screen).
 */
export function milestoneCourseName(course: Pick<Course, 'name'>): string {
  return dropCohortPeriod(course.name)
}
