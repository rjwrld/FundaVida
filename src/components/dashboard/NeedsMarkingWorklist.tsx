import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck } from 'lucide-react'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { useCourses } from '@/hooks/api/courses'
import { useAttendance } from '@/hooks/api/attendance'
import { useSessionExceptions } from '@/hooks/api/sessionExceptions'
import { resolveQueries } from '@/lib/resolveQueries'
import { buildAgenda } from '@/lib/agenda'
import { shortCourseName } from '@/lib/courseName'
import { clock } from '@/lib/clock'

/**
 * The Teacher's hero worklist (ADR-0043): every in-progress Course with unmarked
 * past Sessions, grouped one row per Course (ADR-0044) with a count and a deep
 * link to that Course's *oldest* unmarked Session's mark page. This is the full
 * grouped backlog the calendar aside only teases; marking is the Teacher's most
 * time-sensitive job, so it leads the dashboard.
 *
 * Derives from {@link buildAgenda}'s teacher worklist over three scoped reads,
 * held behind {@link resolveQueries} (ADR-0030) so a default-`[]` window never
 * flashes an empty "nothing to mark" before the Courses/attendance resolve.
 */
export function NeedsMarkingWorklist() {
  const { t } = useTranslation()
  const coursesQuery = useCourses()
  const attendanceQuery = useAttendance()
  const sessionExceptionsQuery = useSessionExceptions()

  const gate = resolveQueries([coursesQuery, attendanceQuery, sessionExceptionsQuery])
  if (gate.isPending) {
    return <SkeletonCard lines={4} data-testid="needs-marking-worklist" />
  }

  const [courses, attendance, sessionExceptions] = gate.data
  const agenda = buildAgenda({
    role: 'teacher',
    courses,
    attendance,
    grades: [],
    enrollments: [],
    certificates: [],
    sessionExceptions,
    now: clock.now(),
  })
  const worklist = agenda.role === 'teacher' ? agenda.worklist : []

  return (
    <article
      className="flex h-full flex-col rounded-lg border border-border bg-card p-5"
      data-testid="needs-marking-worklist"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck
            className="size-4 text-brand-green-700 dark:text-brand-green-300"
            aria-hidden="true"
          />
          <h3 className="font-display text-lg text-foreground">
            {t('dashboard.teacher.needsMarking.title')}
          </h3>
        </div>
        {worklist.length > 0 && (
          <span className="shrink-0 rounded-full bg-brand-green-100 px-2 py-0.5 text-xs font-medium tabular-nums text-brand-green-800 dark:bg-brand-green-500/20 dark:text-brand-green-100">
            {worklist.length}
          </span>
        )}
      </header>

      {worklist.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.teacher.needsMarking.empty')}</p>
      ) : (
        <ul className="flex flex-1 flex-col divide-y divide-border/60">
          {worklist.map((group) => (
            <li key={group.courseId} className="py-2 first:pt-0 last:pb-0">
              <Link
                to={`/app/courses/${group.courseId}/sessions/${group.oldestDate}/mark`}
                className="group flex items-center gap-3 rounded-md py-1"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-brand-green-700 dark:group-hover:text-brand-green-300 group-hover:underline">
                  {shortCourseName({ name: group.courseName, sede: group.sede })}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t('calendar.sidebar.teacher.sessionsToMark', { count: group.count })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
