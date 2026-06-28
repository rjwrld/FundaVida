import { useTranslation } from 'react-i18next'
import { Progress } from '@/components/ui/progress'
import type { TopCourse } from '@/hooks/api/useDashboardStats'

export interface TopCoursesProps {
  courses: TopCourse[]
  /** Course capacity data; if not provided, falls back to enrollment count only. */
  courseCapacities?: Record<string, number>
}

/**
 * Renders top courses with enrollment-against-capacity bars, replacing the
 * relative-max visualization (ADR criterion 2 of #119).
 */
export function TopCourses({ courses, courseCapacities = {} }: TopCoursesProps) {
  const { t } = useTranslation()

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">{t('dashboard.topCourses.title')}</h3>
      </header>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.topCourses.empty')}</p>
      ) : (
        <ul className="flex flex-1 flex-col gap-4">
          {courses.map((course) => {
            const capacity = courseCapacities[course.id] ?? 1
            const enrolled = course.enrollmentCount
            const pct = Math.round((enrolled / capacity) * 100)
            const isFull = enrolled >= capacity
            return (
              <li key={course.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">{course.name}</p>
                  <span
                    className={`shrink-0 text-xs tabular-nums ${isFull ? 'text-brand-red-500 font-medium' : 'text-muted-foreground'}`}
                  >
                    {t('dashboard.topCourses.enrollmentCapacity', {
                      enrolled,
                      capacity,
                    })}
                  </span>
                </div>
                <Progress
                  value={Math.min(pct, 100)}
                  aria-label={t('dashboard.topCourses.capacityLabel', { name: course.name, pct })}
                  className={isFull ? 'opacity-100' : ''}
                />
                <p className="truncate text-[11px] uppercase tracking-wider text-muted-foreground/80">
                  {course.programName}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
