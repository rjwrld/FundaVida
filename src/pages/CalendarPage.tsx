import { useState } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { CalendarWidget } from '@/components/shared/CalendarWidget'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { AgendaSidebar } from '@/components/calendar/AgendaSidebar'
import { WeekCanvas, type CalendarViewMode } from '@/components/calendar/WeekCanvas'
import { type SessionCardStatus } from '@/components/calendar/SessionCard'
import { Button } from '@/components/ui/button'
import { useStore } from '@/data/store'
import {
  useAttendance,
  useCertificates,
  useCourses,
  useEnrollments,
  useGrades,
  useSessionExceptions,
} from '@/hooks/api'
import { buildAgenda } from '@/lib/agenda'
import { clock } from '@/lib/clock'
import { resolveQueries } from '@/lib/resolveQueries'
import { effectiveSessions, isSessionMarked, isSessionRecordable } from '@/lib/sessions'
import { cn } from '@/lib/utils'

/**
 * The role-divergent calendar (ADR-0044). Week is the default: a workweek
 * `WeekCanvas` beside a role-conditioned `AgendaSidebar`. The Week|Month toggle
 * swaps in `CalendarWidget` as a *navigator* — density-scaled marks whose day-tap
 * jumps the week canvas onto that week (no second day-detail view). Responsive is
 * a ladder with one render path: at `lg+` the sidebar-plus-canvas split; below,
 * the sidebar compresses to a one-row banner above the canvas with the full
 * buckets following. Rides the existing Courses scope — no new permission, no
 * `RoleGate` (ADR-0010/0013).
 */
export function CalendarPage() {
  const { t } = useTranslation()
  const role = useStore((s) => s.role)
  const [view, setView] = useState<CalendarViewMode>('week')
  const [weekOf, setWeekOf] = useState<Date>(() => clock.today())

  const coursesQuery = useCourses()
  const attendanceQuery = useAttendance()
  const gradesQuery = useGrades()
  const enrollmentsQuery = useEnrollments()
  const certificatesQuery = useCertificates()
  const sessionExceptionsQuery = useSessionExceptions()

  // The sidebar's verdict (needs-marking count, progress rows, pulse) and every
  // Session surface read six scoped queries; gate on all of them (ADR-0030) so a
  // default-`[]` window can never flash a false count before every query resolves.
  const gate = resolveQueries([
    coursesQuery,
    attendanceQuery,
    gradesQuery,
    enrollmentsQuery,
    certificatesQuery,
    sessionExceptionsQuery,
  ])

  if (!role) return null

  if (gate.isPending) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('calendar.title')} description={t('calendar.subtitle')} />
        <SkeletonTable />
      </div>
    )
  }

  const [courses, attendance, grades, enrollments, certificates, sessionExceptions] = gate.data

  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('calendar.title')} description={t('calendar.subtitle')} />
        <div className="rounded-xl border border-dashed border-border/60 bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
          {t('calendar.noCourses')}
        </div>
      </div>
    )
  }

  // Teachers and admins act on Sessions (mark attendance); students/tcu view only.
  const linkToMark = role === 'admin' || role === 'teacher'
  const now = clock.today()

  // One Date per scoped Session — the density the month navigator scales its marks by.
  const events = courses.flatMap((course) =>
    effectiveSessions(course, sessionExceptions).map((session) => parseISO(session.date))
  )

  const agenda = buildAgenda({
    role,
    courses,
    attendance,
    grades,
    enrollments,
    certificates,
    sessionExceptions,
    now,
  })

  const statusFor = (courseId: string, date: string): SessionCardStatus => {
    if (role === 'student') {
      const record = attendance.find(
        (a) => a.courseId === courseId && isSameDay(parseISO(a.sessionDate), parseISO(date))
      )
      return record ? record.status : 'none'
    }
    if (role === 'teacher' || role === 'admin') {
      const recordable = isSessionRecordable({ courseId, date, ordinal: 0 }, now)
      if (recordable && !isSessionMarked(courseId, date, attendance)) return 'needsMarking'
      return 'none'
    }
    // tcu: read-only schedule, no attendance access at all (ADR-0036).
    return 'none'
  }

  // A month-day tap is a navigator move: land the week canvas on that day's week.
  const handleMonthSelect = (day: Date) => {
    setWeekOf(day)
    setView('week')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('calendar.title')}
        description={t('calendar.subtitle')}
        action={
          <div className="inline-flex rounded-lg border border-border p-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={view === 'week'}
              onClick={() => setView('week')}
              className={cn(
                view === 'week' &&
                  'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
              )}
            >
              {t('calendar.viewToggle.week')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-pressed={view === 'month'}
              onClick={() => setView('month')}
              className={cn(
                view === 'month' &&
                  'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
              )}
            >
              {t('calendar.viewToggle.month')}
            </Button>
          </div>
        }
      />

      {view === 'week' ? (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* Below lg: the one-row action banner rides first, above the canvas. */}
          <div className="lg:hidden">
            <AgendaSidebar agenda={agenda} variant="banner" />
          </div>
          {/* The canvas is the hero at every width (lg: right column). */}
          <div className="lg:order-2">
            <WeekCanvas
              courses={courses}
              sessionExceptions={sessionExceptions}
              weekOf={weekOf}
              onWeekChange={setWeekOf}
              linkToMark={linkToMark}
              statusFor={statusFor}
            />
          </div>
          {/* Full buckets: lg left column; below lg they follow the canvas. */}
          <aside className="rounded-xl border border-border bg-card p-5 lg:order-1">
            <AgendaSidebar agenda={agenda} variant="full" />
          </aside>
        </div>
      ) : (
        <CalendarWidget events={events} onSelect={handleMonthSelect} />
      )}
    </div>
  )
}
