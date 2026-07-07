import { useState } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { CalendarWidget } from '@/components/shared/CalendarWidget'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { AgendaSidebar } from '@/components/calendar/AgendaSidebar'
import { WeekCanvas, type CalendarViewMode } from '@/components/calendar/WeekCanvas'
import { SessionCard, type SessionCardStatus } from '@/components/calendar/SessionCard'
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
import { isSessionMarked, isSessionRecordable } from '@/lib/sessions'
import { sessionsOnDay } from '@/lib/weekAgenda'
import { useDaySessions } from '@/hooks/useDaySessions'
import { cn } from '@/lib/utils'

/**
 * The role-divergent week agenda (ADR-0038): `WeekCanvas` (7 day-columns of
 * SessionCards) + `AgendaSidebar` (role-conditioned buckets from `buildAgenda`).
 * Week is the default view; a Week|Month toggle switches to `CalendarWidget`
 * (month mode). Rides the existing Courses scope — no new permission, no
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

  const { selected, setSelected, events } = useDaySessions(
    gate.isPending ? [] : gate.data[0],
    gate.isPending ? [] : gate.data[5]
  )

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
  // Month mode's day-detail panel (ADR-0038: "tap a day → its cards").
  const daySessions = sessionsOnDay(courses, selected, sessionExceptions)

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
                view === 'week' && 'bg-primary text-primary-foreground hover:bg-primary/90'
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
                view === 'month' && 'bg-primary text-primary-foreground hover:bg-primary/90'
              )}
            >
              {t('calendar.viewToggle.month')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-border bg-card p-5 lg:order-1">
          <AgendaSidebar agenda={agenda} />
        </aside>
        <div className="lg:order-2">
          {view === 'week' ? (
            <WeekCanvas
              courses={courses}
              sessionExceptions={sessionExceptions}
              weekOf={weekOf}
              onWeekChange={setWeekOf}
              linkToMark={linkToMark}
              statusFor={statusFor}
            />
          ) : (
            <div className="space-y-4">
              <CalendarWidget selected={selected} events={events} onSelect={setSelected} />
              <div
                aria-label={t('calendar.panelTitle')}
                className="rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-display text-base text-foreground">
                  {t('calendar.panelTitle')}
                </h3>
                {daySessions.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">{t('calendar.emptyDay')}</p>
                ) : (
                  <div className="mt-3 flex flex-col gap-2">
                    {daySessions.map((session) => (
                      <SessionCard
                        key={`${session.courseId}-${session.date}`}
                        course={session.course}
                        session={session}
                        status={statusFor(session.courseId, session.date)}
                        linkToMark={linkToMark}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
