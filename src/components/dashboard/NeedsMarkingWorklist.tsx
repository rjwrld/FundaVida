import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WorklistCard, WorklistRow } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { useCourses } from '@/hooks/api/courses'
import { useAttendance } from '@/hooks/api/attendance'
import { useSessionExceptions } from '@/hooks/api/sessionExceptions'
import { resolveQueries } from '@/lib/resolveQueries'
import { buildAgenda } from '@/lib/agenda'
import { shortCourseName } from '@/lib/courseName'
import { clock } from '@/lib/clock'
import { useFormat } from '@/hooks/useFormat'

/**
 * The Teacher's hero worklist (ADR-0043): every in-progress Course with unmarked
 * past Sessions, grouped one row per Course (ADR-0044) with a count and a deep
 * link to that Course's *oldest* unmarked Session's mark page. This is the full
 * grouped backlog; marking is the Teacher's most time-sensitive job, so it leads
 * the dashboard. Each row links to its Course, names the oldest unmarked Session
 * ("Session n · date"), and carries the one action an overdue Session earns:
 * Mark, onto that Session's mark page (ADR-0050).
 *
 * Derives from {@link buildAgenda}'s teacher worklist over three scoped reads,
 * held behind {@link resolveQueries} (ADR-0030) so a default-`[]` window never
 * flashes an empty "nothing to mark" before the Courses/attendance resolve.
 */
export function NeedsMarkingWorklist() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
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
    sessionExceptions,
    now: clock.now(),
  })
  const worklist = agenda.role === 'teacher' ? agenda.worklist : []

  return (
    <WorklistCard
      title={t('dashboard.teacher.needsMarking.title')}
      icon={ClipboardCheck}
      count={worklist.length}
      emptyLabel={t('dashboard.teacher.needsMarking.empty')}
      data-testid="needs-marking-worklist"
    >
      {worklist.map((group) => {
        // The group's oldest unmarked Session: the row names it and Mark opens it.
        const name = shortCourseName({ name: group.courseName, sede: group.sede })
        const date = formatDate(group.oldestDate)
        return (
          <WorklistRow
            key={group.courseId}
            to={`/app/courses/${group.courseId}`}
            title={name}
            subtitle={t('dashboard.worklist.sessionLine', { n: group.oldestOrdinal, date })}
            trailing={
              group.count > 1 ? (
                <span className="text-xs text-muted-foreground">
                  {t('calendar.sidebar.teacher.sessionsToMark', { count: group.count })}
                </span>
              ) : undefined
            }
            action={
              <Button size="sm" variant="outline" asChild>
                <Link
                  to={`/app/courses/${group.courseId}/sessions/${group.oldestDate}/mark`}
                  aria-label={t('calendar.card.markAria', {
                    course: name,
                    date,
                    n: group.oldestOrdinal,
                  })}
                >
                  {t('dashboard.worklist.mark')}
                </Link>
              </Button>
            }
          />
        )
      })}
    </WorklistCard>
  )
}
