import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CalendarDays, ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UpcomingList, type UpcomingItem } from '@/components/shared/UpcomingList'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { useCourses } from '@/hooks/api/courses'
import { useAttendance } from '@/hooks/api/attendance'
import { useGrades } from '@/hooks/api/grades'
import { useEnrollments } from '@/hooks/api/enrollments'
import { useCertificates } from '@/hooks/api/certificates'
import { useSessionExceptions } from '@/hooks/api/sessionExceptions'
import { useStore } from '@/data/store'
import { clock } from '@/lib/clock'
import { resolveQueries } from '@/lib/resolveQueries'
import { buildAgenda, type NeedsMarkingSession, type AgendaProgressRow } from '@/lib/agenda'
import { useFormat } from '@/hooks/useFormat'

const NEEDS_MARKING_LIMIT = 3
const UPCOMING_LIMIT = 3

/**
 * The dashboard aside's compact role agenda (ADR-0038), replacing the decorative
 * `DashboardCalendar` month grid. Grows from {@link UpcomingList}: every variant
 * ends with a link to the full `/app/calendar` week agenda. Derives its buckets
 * from {@link buildAgenda} over five role-scoped hooks, held behind
 * {@link resolveQueries} (ADR-0030) so no variant ever flashes a false count from
 * a hook that hasn't resolved yet.
 */
export function AgendaSlice() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const role = useStore((s) => s.role)
  const coursesQuery = useCourses()
  const attendanceQuery = useAttendance()
  const gradesQuery = useGrades()
  const enrollmentsQuery = useEnrollments()
  const certificatesQuery = useCertificates()
  const sessionExceptionsQuery = useSessionExceptions()

  const gate = resolveQueries([
    coursesQuery,
    attendanceQuery,
    gradesQuery,
    enrollmentsQuery,
    certificatesQuery,
    sessionExceptionsQuery,
  ])

  if (gate.isPending || !role) {
    return <SkeletonCard lines={4} data-testid="agenda-slice" />
  }

  const [courses, attendance, grades, enrollments, certificates, sessionExceptions] = gate.data
  const agenda = buildAgenda({
    role,
    courses,
    attendance,
    grades,
    enrollments,
    certificates,
    sessionExceptions,
    now: clock.now(),
  })

  const upcomingItems: UpcomingItem[] = agenda.upcoming.slice(0, UPCOMING_LIMIT).map((session) => ({
    id: `${session.courseId}-${session.date}`,
    title: session.courseName,
    subtitle: formatDate(session.date),
  }))

  return (
    <section className="rounded-lg border border-border bg-card p-5" data-testid="agenda-slice">
      <header className="mb-3 flex items-center gap-2">
        <CalendarDays
          className="size-4 text-brand-green-700 dark:text-brand-green-300"
          aria-hidden="true"
        />
        <h3 className="font-display text-base text-foreground">
          {t('dashboard.rightPanel.agendaTitle')}
        </h3>
      </header>

      {agenda.role === 'teacher' && (
        <NeedsMarkingList sessions={agenda.needsMarking.slice(0, NEEDS_MARKING_LIMIT)} />
      )}

      {agenda.role === 'admin' && (
        <dl className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <dt className="text-xs text-muted-foreground">
              {t('dashboard.rightPanel.pulse.unmarked')}
            </dt>
            <dd className="font-display text-xl tabular-nums text-foreground">
              {agenda.pulse.unmarkedCount}
            </dd>
          </div>
          <div className="rounded-md bg-muted/50 px-3 py-2">
            <dt className="text-xs text-muted-foreground">
              {t('dashboard.rightPanel.pulse.toClose')}
            </dt>
            <dd className="font-display text-xl tabular-nums text-foreground">
              {agenda.pulse.coursesToCloseCount}
            </dd>
          </div>
        </dl>
      )}

      {agenda.role === 'student' && <ProgressList rows={agenda.progress} t={t} />}

      <div className="mb-3">
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t('dashboard.rightPanel.agendaUpcomingTitle')}
        </h4>
        <UpcomingList
          items={upcomingItems}
          emptyLabel={t('dashboard.rightPanel.agendaUpcomingEmpty')}
        />
      </div>

      <Link
        to="/app/calendar"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-green-700 dark:text-brand-green-300 hover:underline"
      >
        {t('dashboard.rightPanel.openCalendar')}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  )
}

function NeedsMarkingList({ sessions }: { sessions: NeedsMarkingSession[] }) {
  const { t } = useTranslation()

  return (
    <div className="mb-4">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('dashboard.rightPanel.needsMarkingTitle')}
      </h4>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('dashboard.rightPanel.needsMarkingEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {sessions.map((session) => (
            <li key={`${session.courseId}-${session.date}`} className="py-2 first:pt-0 last:pb-0">
              <Link
                to={`/app/courses/${session.courseId}/sessions/${session.date}/mark`}
                className="group flex items-center gap-2 rounded-md py-1"
              >
                <ClipboardCheck
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-brand-green-700 dark:group-hover:text-brand-green-300 group-hover:underline">
                  {session.courseName}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ProgressList({
  rows,
  t,
}: {
  rows: AgendaProgressRow[]
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('dashboard.rightPanel.progressTitle')}
      </h4>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.rightPanel.progressEmpty')}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {rows.map((row) => (
            <li
              key={row.courseName}
              className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {row.courseName}
              </span>
              {row.total === 0 ? (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t('dashboard.rightPanel.noSessionsRecorded')}
                </span>
              ) : (
                <Badge variant={row.onTrack ? 'success' : 'destructive'} className="shrink-0">
                  {t('dashboard.rightPanel.progressCount', {
                    present: row.present,
                    total: row.total,
                  })}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
