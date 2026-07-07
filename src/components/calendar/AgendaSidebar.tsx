import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { useFormat } from '@/hooks/useFormat'
import type { RoleAgenda } from '@/lib/agenda'

export interface AgendaSidebarProps {
  agenda: RoleAgenda
}

/**
 * The role-scoped agenda sidebar (ADR-0038): teacher gets a "needs marking"
 * worklist hero + Upcoming, admin gets a summarized operational pulse +
 * Upcoming, student gets "My progress" + Upcoming, tcu gets Upcoming only
 * (read-only). Purely presentational over the already-derived `RoleAgenda`
 * (`buildAgenda`, ADR-0038/#238) — no query wiring here.
 */
export function AgendaSidebar({ agenda }: AgendaSidebarProps) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()

  return (
    <div className="space-y-4">
      {agenda.role === 'teacher' && (
        <section aria-label={t('calendar.sidebar.teacher.worklistTitle')}>
          <h3 className="font-display text-base text-foreground">
            {t('calendar.sidebar.teacher.worklistTitle')}
          </h3>
          {agenda.needsMarking.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('calendar.sidebar.teacher.empty')}
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {agenda.needsMarking.map((session) => (
                <li key={`${session.courseId}-${session.date}`} className="text-sm">
                  <Link
                    to={`/app/courses/${session.courseId}/sessions/${session.date}/mark`}
                    className="text-foreground hover:text-brand-green-700 hover:underline dark:hover:text-brand-green-300"
                  >
                    {t('calendar.sessionEntry', {
                      course: session.courseName,
                      ordinal: String(session.ordinal),
                    } as Record<string, string>)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {agenda.role === 'admin' && (
        <section aria-label={t('calendar.sidebar.admin.pulseTitle')}>
          <h3 className="font-display text-base text-foreground">
            {t('calendar.sidebar.admin.pulseTitle')}
          </h3>
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="text-foreground">
              {agenda.pulse.unmarkedCount === 0
                ? t('calendar.sidebar.admin.unmarkedNone')
                : t('calendar.sidebar.admin.unmarked', { count: agenda.pulse.unmarkedCount })}
            </p>
            {agenda.pulse.coursesToCloseCount > 0 && (
              <Link
                to="/app/courses"
                className="block text-brand-green-700 hover:underline dark:text-brand-green-300"
              >
                {t('calendar.sidebar.admin.coursesToClose', {
                  count: agenda.pulse.coursesToCloseCount,
                })}
              </Link>
            )}
          </div>
        </section>
      )}

      {agenda.role === 'student' && (
        <section aria-label={t('calendar.sidebar.student.progressTitle')}>
          <h3 className="font-display text-base text-foreground">
            {t('calendar.sidebar.student.progressTitle')}
          </h3>
          <ul className="mt-2 space-y-3">
            {agenda.progress.map((row) => (
              <li key={row.courseName} className="text-sm">
                <p className="font-medium text-foreground">{row.courseName}</p>
                <div className="mt-1 flex items-center gap-2">
                  {row.total === 0 ? (
                    <span className="text-muted-foreground">
                      {t('calendar.sidebar.student.noSessionsRecorded')}
                    </span>
                  ) : (
                    <>
                      <span className="text-muted-foreground">
                        {t('calendar.sidebar.student.attended', {
                          present: row.present,
                          total: row.total,
                        })}
                      </span>
                      {row.onTrack ? (
                        <Badge variant="success">{t('calendar.sidebar.student.onTrack')}</Badge>
                      ) : null}
                    </>
                  )}
                </div>
                <div className="mt-1">
                  {row.certificate ? (
                    <Badge variant="success">
                      {t('calendar.sidebar.student.certificateEarned')}
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t('calendar.sidebar.student.certPending')}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label={t('calendar.sidebar.upcomingTitle')}>
        <h3 className="font-display text-base text-foreground">
          {t('calendar.sidebar.upcomingTitle')}
        </h3>
        {agenda.upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('calendar.emptyDay')}</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {agenda.upcoming.slice(0, 5).map((session) => (
              <li key={`${session.courseId}-${session.date}`} className="text-sm text-foreground">
                {session.courseName} — {formatDate(session.date)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
