import { useTranslation } from 'react-i18next'
import { Progress } from '@/components/ui/progress'
import type { TopCourse } from '@/hooks/api/useDashboardStats'

export interface TopCoursesProps {
  courses: TopCourse[]
}

// Progress denominator uses the max enrollment among the top three since
// Course has no `capacity` field — the bar shows relative weight, not a quota.
export function TopCourses({ courses }: TopCoursesProps) {
  const { t } = useTranslation()
  const max = Math.max(1, ...courses.map((c) => c.enrollmentCount))

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">{t('dashboard.topCourses.title')}</h3>
      </header>
      {courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.topCourses.empty')}</p>
      ) : (
        <ul className="flex flex-1 flex-col gap-4">
          {courses.map((course) => {
            const pct = Math.round((course.enrollmentCount / max) * 100)
            return (
              <li key={course.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">{course.name}</p>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {t('dashboard.topCourses.enrollments', { count: course.enrollmentCount })}
                  </span>
                </div>
                <Progress value={pct} aria-label={course.name} />
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
