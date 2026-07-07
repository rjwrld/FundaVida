import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { isSameDay, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { NoResults } from '@/components/shared/NoResults'
import { useFormat } from '@/hooks/useFormat'
import { isSessionRecordable, isSessionUpcoming, type Session } from '@/lib/sessions'
import type { CloseReadiness } from '@/lib/closeReadiness'
import type { AttendanceRecord, Course } from '@/types'

/** How many Upcoming rows stay visible before the rest fold into a disclosure. */
const UPCOMING_VISIBLE = 3

interface CourseSessionsSectionProps {
  course: Course
  /** Every derived Session for the Course (ADR-0001), ascending. */
  sessions: Session[]
  /** The clock's today, at day granularity — the one session-window boundary (ADR-0034). */
  today: Date
  /**
   * Teacher/admin marking capability. Enables the Needs-attendance queue,
   * present-counts, and the mark/review actions. A Student passes `false`: the
   * same Session groups render with no verdicts and no actions.
   */
  canMark: boolean
  /**
   * The `closeReadiness` verdict feeding the Needs-attendance queue — the same
   * call the readiness checklist makes, so the two agree by construction
   * (ADR-0037). `null` for a Student, or while the attendance window is still
   * loading: the caller gates it through `resolveQueries` so a default-`[]`
   * window can never flash a false "needs attendance" (ADR-0030).
   */
  readiness: CloseReadiness | null
  /**
   * Scoped attendance records for present-counts — every record for a marker,
   * the Student's own for a Student. Resolved whenever `readiness` is non-null.
   */
  attendance: AttendanceRecord[]
  /** Roster size: the denominator in "{present}/{total} present". */
  enrolledCount: number
}

/**
 * One Sessions surface for a Course, grouped by state (ADR-0037): the
 * Needs-attendance queue first, then Today, Upcoming, and Recorded. Replaces the
 * old Schedule wall and the inline attendance-marking wall — the same ~26
 * Sessions once rendered twice. Marking navigates to MarkSessionAttendancePage,
 * the app's only marking surface; this section never marks inline.
 */
export function CourseSessionsSection({
  course,
  sessions,
  today,
  canMark,
  readiness,
  attendance,
  enrolledCount,
}: CourseSessionsSectionProps) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()

  const sessionLabel = (session: Session) =>
    `${t('attendance.list.session', { ordinal: String(session.ordinal) } as Record<
      string,
      string
    >)} · ${formatDate(session.date)}`

  const markHref = (session: Session) => `/app/courses/${course.id}/sessions/${session.date}/mark`

  const presentCount = (session: Session) =>
    attendance.filter(
      (a) => a.status === 'present' && isSameDay(parseISO(a.sessionDate), parseISO(session.date))
    ).length

  // Partition by the single session-window boundary (ADR-0034). Today is pulled
  // out of the past/upcoming split so it can carry its own accent and action.
  const todaySession = sessions.find((s) => isSameDay(parseISO(s.date), today)) ?? null
  const upcoming = sessions.filter((s) => isSessionUpcoming(s, today))
  const past = sessions.filter(
    (s) => isSessionRecordable(s, today) && !isSameDay(parseISO(s.date), today)
  )

  // Verdicts (needs-attendance vs recorded) exist only once `readiness` resolves
  // for a marker. While it is null we still show Today/Upcoming (pure date math),
  // holding the past groups so a loading `[]` attendance window can't flash a
  // false queue (ADR-0030/0037).
  const showVerdicts = canMark && readiness !== null
  const pastPending = canMark && readiness === null && past.length > 0

  const unrecordedDates = new Set(readiness?.unrecordedSessions.map((s) => s.date) ?? [])
  const needsAttendance = showVerdicts ? past.filter((s) => unrecordedDates.has(s.date)) : []
  const recorded = showVerdicts ? past.filter((s) => !unrecordedDates.has(s.date)) : []

  const markAction = (session: Session, primary: boolean) => (
    <Button asChild size="sm" variant={primary ? 'default' : 'outline'}>
      <Link
        to={markHref(session)}
        aria-label={t('courses.detail.sessions.markNamed', { session: sessionLabel(session) })}
      >
        {t('courses.detail.sessions.mark')}
      </Link>
    </Button>
  )

  const reviewAction = (session: Session) => (
    <Button asChild size="sm" variant="ghost">
      <Link
        to={markHref(session)}
        aria-label={t('courses.detail.sessions.reviewNamed', { session: sessionLabel(session) })}
      >
        {t('courses.detail.sessions.review')}
      </Link>
    </Button>
  )

  return (
    <section aria-labelledby="course-sessions-heading" className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="course-sessions-heading" className="text-lg font-semibold tracking-tight">
          {t('courses.detail.sessions.heading')}
        </h2>
        {showVerdicts && (
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {t('courses.detail.sessions.summary', {
              recorded: recorded.length,
              needsAttendance: needsAttendance.length,
            })}
          </p>
        )}
      </div>

      {sessions.length === 0 ? (
        <NoResults message={t('courses.detail.sessions.empty')} />
      ) : (
        <div className="space-y-4">
          {/* Needs attendance — the workflow queue, expanded (teacher/admin). */}
          {showVerdicts && needsAttendance.length > 0 && (
            <SessionGroup label={t('courses.detail.sessions.groups.needsAttendance')}>
              {needsAttendance.map((session) => (
                <SessionRow
                  key={session.date}
                  label={sessionLabel(session)}
                  meta={t('courses.detail.sessions.unrecorded', { total: enrolledCount })}
                  action={markAction(session, false)}
                />
              ))}
            </SessionGroup>
          )}

          {/* Today — its primary (Figure Green) mark action is the page's single
              green accent; the row itself stays flat and ruled (DESIGN.md). */}
          {todaySession && (
            <SessionGroup label={t('courses.detail.sessions.groups.today')}>
              <SessionRow
                label={sessionLabel(todaySession)}
                action={canMark ? markAction(todaySession, true) : undefined}
              />
            </SessionGroup>
          )}

          {/* Upcoming — next few visible, the rest behind a keyboard-native disclosure. */}
          {upcoming.length > 0 && (
            <SessionGroup label={t('courses.detail.sessions.groups.upcoming')}>
              {upcoming.slice(0, UPCOMING_VISIBLE).map((session) => (
                <SessionRow key={session.date} label={sessionLabel(session)} />
              ))}
              {upcoming.length > UPCOMING_VISIBLE && (
                <li>
                  <details className="group">
                    <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {t('courses.detail.sessions.showMore', {
                        n: upcoming.length - UPCOMING_VISIBLE,
                      })}
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {upcoming.slice(UPCOMING_VISIBLE).map((session) => (
                        <SessionRow key={session.date} label={sessionLabel(session)} />
                      ))}
                    </ul>
                  </details>
                </li>
              )}
            </SessionGroup>
          )}

          {/* Recorded — collapsed; each row shows its present-count and a Review action. */}
          {showVerdicts && recorded.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-sm font-semibold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {`${t('courses.detail.sessions.groups.recorded')} · ${recorded.length}`}
              </summary>
              <ul
                aria-label={t('courses.detail.sessions.groups.recorded')}
                className="mt-2 space-y-2"
              >
                {recorded.map((session) => (
                  <SessionRow
                    key={session.date}
                    label={sessionLabel(session)}
                    meta={t('courses.detail.sessions.present', {
                      present: presentCount(session),
                      total: enrolledCount,
                    })}
                    action={reviewAction(session)}
                  />
                ))}
              </ul>
            </details>
          )}

          {/* Past — a Student's read-only view: no verdicts, no actions (ADR-0037). */}
          {!canMark && past.length > 0 && (
            <SessionGroup label={t('courses.detail.sessions.groups.past')}>
              {past.map((session) => (
                <SessionRow key={session.date} label={sessionLabel(session)} />
              ))}
            </SessionGroup>
          )}

          {/* A marker whose attendance window is still loading: hold the past groups. */}
          {pastPending && (
            <p className="text-sm text-muted-foreground">{t('courses.detail.loading')}</p>
          )}
        </div>
      )}
    </section>
  )
}

/** A labeled group heading with its named list of Session rows (a11y: ADR-0037). */
function SessionGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold tracking-tight text-muted-foreground">{label}</h3>
      <ul aria-label={label} className="space-y-2">
        {children}
      </ul>
    </div>
  )
}

interface SessionRowProps {
  label: string
  /** Right-aligned count ("3/10 present", "0/10 recorded") — mono, tabular. */
  meta?: string
  action?: React.ReactNode
}

function SessionRow({ label, meta, action }: SessionRowProps) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm text-foreground">
      <span>{label}</span>
      <div className="flex items-center gap-3">
        {meta && (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{meta}</span>
        )}
        {action}
      </div>
    </li>
  )
}
