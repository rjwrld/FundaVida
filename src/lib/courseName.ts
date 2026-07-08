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
 * The calendar card's title: {@link shortCourseName} with the trailing
 * "({mon yyyy})" cohort period also dropped (ADR-0044). A calendar already
 * communicates *when*, so the card spends its two lines on the Program + Level
 * and lets the tooltip / accessible name carry the full canonical name. The
 * cohort suffix is the last parenthetical segment the seed appends
 * (`… — {Sede} ({mon yyyy})`); teacher-authored names without one are returned
 * unchanged. `shortCourseName` is untouched — other surfaces still want the
 * Sede-stripped name *with* the period.
 */
export function calendarCardName(course: Pick<Course, 'name' | 'sede'>): string {
  return shortCourseName(course)
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
}
