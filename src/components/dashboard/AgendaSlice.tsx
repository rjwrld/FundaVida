import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { WorklistCard, WorklistRow } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { useCourses } from '@/hooks/api/courses'
import { useSessionExceptions } from '@/hooks/api/sessionExceptions'
import { useFormat } from '@/hooks/useFormat'
import { clock } from '@/lib/clock'
import { resolveQueries } from '@/lib/resolveQueries'
import { upcomingSessions } from '@/lib/sessions'
import { calendarCardName } from '@/lib/courseName'

const UPCOMING_LIMIT = 3

/**
 * The dashboard aside for the roles that keep one — teacher and student
 * (ADR-0050, amending ADR-0038): the next three Sessions across the viewer's
 * scoped Courses, each row linking to its Course, ending with a link to the
 * full `/app/calendar`. Nothing else: the teacher's needs-marking hero is the
 * main column's card and the student's progress is the courses table's
 * Attendance column, so the aside no longer repeats either.
 *
 * Rows use the calendar's short name ({@link calendarCardName}); dropping the
 * Sede is safe here because a teacher's and a student's Courses all sit at
 * their one Sede (ADR-0011). Upcoming Sessions cannot be marked yet
 * (ADR-0034), so no row carries a button.
 */
export function AgendaSlice() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  // Courses and their exceptions overlay (ADR-0039) both shape the next Sessions;
  // gate on both so no default-[] window flashes "Nothing on deck" (ADR-0030).
  const gate = resolveQueries([useCourses(), useSessionExceptions()])

  if (gate.isPending) {
    return <SkeletonCard lines={3} data-testid="agenda-slice" />
  }

  const [courses, sessionExceptions] = gate.data
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const upcoming = upcomingSessions(courses, clock.now(), UPCOMING_LIMIT, sessionExceptions)

  return (
    <WorklistCard
      title={t('dashboard.rightPanel.agendaUpcomingTitle')}
      icon={CalendarDays}
      emptyLabel={t('dashboard.rightPanel.agendaUpcomingEmpty')}
      viewAll={{ to: '/app/calendar', label: t('dashboard.rightPanel.openCalendar') }}
      data-testid="agenda-slice"
    >
      {upcoming.map((session) => {
        const course = courseById.get(session.courseId)
        return (
          <WorklistRow
            key={`${session.courseId}-${session.date}`}
            to={`/app/courses/${session.courseId}`}
            title={course ? calendarCardName(course) : session.courseName}
            subtitle={t('dashboard.worklist.sessionLine', {
              n: session.ordinal,
              date: formatDate(session.date),
            })}
          />
        )
      })}
    </WorklistCard>
  )
}
