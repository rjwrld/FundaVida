import { useTranslation } from 'react-i18next'
import { GraduationCap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { WorklistCard, WorklistRow } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { clock } from '@/lib/clock'
import { closeReadiness } from '@/lib/closeReadiness'
import { coursesToClose } from '@/lib/dashboard'
import { resolveQueries } from '@/lib/resolveQueries'
import { useAttendance } from '@/hooks/api/attendance'
import { useCourses } from '@/hooks/api/courses'
import { useEnrollments } from '@/hooks/api/enrollments'
import { useGrades } from '@/hooks/api/grades'
import { useSessionExceptions } from '@/hooks/api/sessionExceptions'
import { useFormat } from '@/hooks/useFormat'

/**
 * The "Courses to close" worklist: published cohorts whose Term has ended and so
 * await the close ceremony (ADR-0024), which emits their Certificates. Each row
 * carries its close-readiness: "Ready to close", or the blockers still open.
 * Reads the role-scoped {@link useCourses} query, so admin sees every Sede's
 * eligible cohorts and a Teacher sees only their own — no raw store access.
 * Each row links to the Course detail page, where the close action lives.
 */
export function CoursesToClose() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const gate = resolveQueries([
    useCourses(),
    useEnrollments(),
    useGrades(),
    useAttendance(),
    useSessionExceptions(),
  ])

  // Same derivation as the detail page's checklist (#204), over the SAME composed
  // seam (ADR-0039: close-readiness reads effectiveSessions), so the two verdicts
  // agree by construction. Held until all five reads resolve — an empty
  // grades/attendance/exceptions window would misread as "ready" (ADR-0030).
  if (gate.isPending) return <SkeletonCard lines={3} />

  const [courses, enrollments, grades, attendance, sessionExceptions] = gate.data
  const now = clock.now()
  const closeable = coursesToClose(courses, now)

  return (
    <WorklistCard
      title={t('dashboard.coursesToClose.title')}
      icon={GraduationCap}
      count={closeable.length}
      emptyLabel={t('dashboard.coursesToClose.empty')}
    >
      {closeable.map((course) => {
        const readiness = closeReadiness({
          course,
          enrollments,
          grades,
          attendance,
          sessionExceptions,
          now,
        })
        return (
          <WorklistRow
            key={course.id}
            to={`/app/courses/${course.id}`}
            title={course.name}
            subtitle={t('dashboard.coursesToClose.ended', { date: formatDate(course.term.end) })}
            trailing={
              // A blocked row names its blockers with the same counts the detail
              // checklist shows, so "why not yet" reads at a glance.
              <span
                className="flex flex-wrap justify-end gap-1"
                data-testid="close-readiness-indicator"
              >
                {readiness.ready ? (
                  <Badge variant="success">{t('courses.detail.readiness.verdict.ready')}</Badge>
                ) : (
                  <>
                    {readiness.ungradedStudentIds.length > 0 && (
                      <Badge variant="warning">
                        {t('courses.detail.readiness.grades.fail', {
                          count: readiness.ungradedStudentIds.length,
                        })}
                      </Badge>
                    )}
                    {readiness.unrecordedSessions.length > 0 && (
                      <Badge variant="warning">
                        {t('courses.detail.readiness.attendance.fail', {
                          count: readiness.unrecordedSessions.length,
                        })}
                      </Badge>
                    )}
                  </>
                )}
              </span>
            }
          />
        )
      })}
    </WorklistCard>
  )
}
