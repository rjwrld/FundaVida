import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { clock } from '@/lib/clock'
import { closeReadiness } from '@/lib/closeReadiness'
import { coursesToClose } from '@/lib/dashboard'
import { useAttendance } from '@/hooks/api/attendance'
import { useCourses } from '@/hooks/api/courses'
import { useEnrollments } from '@/hooks/api/enrollments'
import { useGrades } from '@/hooks/api/grades'
import { useSessionExceptions } from '@/hooks/api/sessionExceptions'
import { useFormat } from '@/hooks/useFormat'

/**
 * The "Courses to close" worklist: published cohorts whose Term has ended and so
 * are ready for the close ceremony (ADR-0024), which emits their Certificates.
 * Reads the role-scoped {@link useCourses} query, so admin sees every Sede's
 * eligible cohorts and a Teacher sees only their own — no raw store access.
 * Each row links to the Course detail page, where the close action lives.
 */
export function CoursesToClose() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const { data: courses = [], isLoading } = useCourses()
  const { data: enrollments } = useEnrollments()
  const { data: grades } = useGrades()
  const { data: attendance } = useAttendance()
  const { data: sessionExceptions } = useSessionExceptions()

  const closeable = useMemo(() => coursesToClose(courses, clock.now()), [courses])

  // Same derivation as the detail page's checklist (#204), over the SAME composed
  // seam (ADR-0039: close-readiness reads effectiveSessions), so the two verdicts
  // agree by construction. Null until all record queries resolve — an empty
  // grades/attendance/exceptions window would misread as "ready".
  const readinessById = useMemo(() => {
    if (!enrollments || !grades || !attendance || !sessionExceptions) return null
    const now = clock.now()
    return new Map(
      closeable.map((course) => [
        course.id,
        closeReadiness({ course, enrollments, grades, attendance, sessionExceptions, now }),
      ])
    )
  }, [closeable, enrollments, grades, attendance, sessionExceptions])

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">
          {t('dashboard.coursesToClose.title')}
        </h3>
        {closeable.length > 0 && (
          <span className="shrink-0 rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium tabular-nums text-brand-green-800 dark:bg-brand-green-500/20 dark:text-brand-green-100">
            {closeable.length}
          </span>
        )}
      </header>
      {isLoading ? null : closeable.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.coursesToClose.empty')}</p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-border/60">
          {closeable.map((course) => {
            const readiness = readinessById?.get(course.id)
            return (
              <li key={course.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  to={`/app/courses/${course.id}`}
                  className="group flex items-center gap-3 rounded-md py-1"
                >
                  <GraduationCap
                    className="size-4 shrink-0 text-brand-green-700 dark:text-brand-green-300"
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground group-hover:text-brand-green-700 dark:group-hover:text-brand-green-300 group-hover:underline">
                      {course.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {t('dashboard.coursesToClose.ended', { date: formatDate(course.term.end) })}
                    </span>
                  </span>
                  {readiness && (
                    <Badge
                      variant={readiness.ready ? 'success' : 'warning'}
                      className="shrink-0"
                      data-testid="close-readiness-indicator"
                    >
                      {readiness.ready
                        ? t('courses.detail.readiness.verdict.ready')
                        : t('courses.detail.readiness.verdict.blocked')}
                    </Badge>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </article>
  )
}
