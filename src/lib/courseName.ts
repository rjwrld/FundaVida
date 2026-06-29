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
