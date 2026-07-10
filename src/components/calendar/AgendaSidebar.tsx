import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useFormat } from '@/hooks/useFormat'
import { calendarCardName } from '@/lib/courseName'
import type {
  AdminAgenda,
  RoleAgenda,
  StudentAgenda,
  TeacherAgenda,
  WorklistGroup,
} from '@/lib/agenda'

export interface AgendaSidebarProps {
  agenda: RoleAgenda
  /**
   * `'full'` (default) is the desktop split's stacked buckets; `'banner'` is the
   * one-row compression that rides above the canvas below the `lg` split — the
   * role's single most actionable fact (ADR-0044).
   */
  variant?: 'full' | 'banner'
}

const markHref = (courseId: string, date: string) =>
  `/app/courses/${courseId}/sessions/${date}/mark`

/**
 * The role-scoped agenda sidebar (ADR-0044). Full variant: the teacher's
 * worklist grouped by Course (one row, a count, a deep link to the oldest
 * unmarked Session), the admin's operational pulse as deep-linked stat rows, the
 * student's progress, and a bounded Upcoming bucket. Empty worklists / zero
 * pulse render as quiet caught-up states, not holes. Banner variant compresses
 * to the one fact that matters at that role. Purely presentational over the
 * already-derived `RoleAgenda` (`buildAgenda`) — no query wiring here.
 */
export function AgendaSidebar({ agenda, variant = 'full' }: AgendaSidebarProps) {
  if (variant === 'banner') return <AgendaBanner agenda={agenda} />

  return (
    <div className="space-y-4">
      {agenda.role === 'teacher' && <TeacherWorklist agenda={agenda} />}
      {agenda.role === 'admin' && <AdminPulse agenda={agenda} />}
      {agenda.role === 'student' && <StudentProgress agenda={agenda} />}
      <UpcomingBucket agenda={agenda} />
    </div>
  )
}

function WorklistRow({ group }: { group: WorklistGroup }) {
  const { t } = useTranslation()
  return (
    <li>
      <Link
        to={markHref(group.courseId, group.oldestDate)}
        className="group flex flex-col rounded-md py-1 text-sm"
      >
        <span className="font-medium text-foreground group-hover:text-brand-green-700 dark:group-hover:text-brand-green-300">
          {calendarCardName({ name: group.courseName, sede: group.sede })}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {t('calendar.sidebar.teacher.sessionsToMark', { count: group.count })}
          <ArrowRight
            className="size-3 text-brand-green-700 dark:text-brand-green-300"
            aria-hidden="true"
          />
        </span>
      </Link>
    </li>
  )
}

function TeacherWorklist({ agenda }: { agenda: TeacherAgenda }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('calendar.sidebar.teacher.worklistTitle')}>
      <h3 className="font-display text-base text-foreground">
        {t('calendar.sidebar.teacher.worklistTitle')}
      </h3>
      {agenda.worklist.length === 0 ? (
        <CaughtUp
          title={t('calendar.sidebar.teacher.caughtUpTitle')}
          body={t('calendar.sidebar.teacher.caughtUpBody')}
        />
      ) : (
        <ul className="mt-2 space-y-2">
          {agenda.worklist.map((group) => (
            <WorklistRow key={group.courseId} group={group} />
          ))}
        </ul>
      )}
    </section>
  )
}

function StatRow({
  count,
  label,
  to,
  action,
}: {
  count: number
  label: string
  to: string
  action: string
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="font-display text-2xl tabular-nums text-foreground">{count}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{label}</p>
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-green-700 hover:underline dark:text-brand-green-300"
        >
          {action}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

function AdminPulse({ agenda }: { agenda: AdminAgenda }) {
  const { t } = useTranslation()
  const { unmarkedCount, coursesToCloseCount } = agenda.pulse
  const caughtUp = unmarkedCount === 0 && coursesToCloseCount === 0

  return (
    <section aria-label={t('calendar.sidebar.admin.pulseTitle')}>
      <h3 className="font-display text-base text-foreground">
        {t('calendar.sidebar.admin.pulseTitle')}
      </h3>
      {caughtUp ? (
        <CaughtUp
          title={t('calendar.sidebar.admin.unmarkedNone')}
          body={t('calendar.sidebar.admin.caughtUpBody')}
        />
      ) : (
        <div className="mt-3 space-y-3">
          {unmarkedCount > 0 && (
            <StatRow
              count={unmarkedCount}
              label={t('calendar.sidebar.admin.unmarkedLabel')}
              to="/app/attendance"
              action={t('calendar.sidebar.admin.view')}
            />
          )}
          {coursesToCloseCount > 0 && (
            <StatRow
              count={coursesToCloseCount}
              label={t('calendar.sidebar.admin.toCloseLabel')}
              to="/app/courses"
              action={t('calendar.sidebar.admin.review')}
            />
          )}
        </div>
      )}
    </section>
  )
}

function StudentProgress({ agenda }: { agenda: StudentAgenda }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('calendar.sidebar.student.progressTitle')}>
      <h3 className="font-display text-base text-foreground">
        {t('calendar.sidebar.student.progressTitle')}
      </h3>
      <ul className="mt-2 space-y-3">
        {agenda.progress.map((row) => (
          <li key={row.courseName} className="text-sm">
            <p className="font-medium text-foreground">
              {calendarCardName({ name: row.courseName, sede: row.sede })}
            </p>
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
                <Badge variant="success">{t('calendar.sidebar.student.certificateEarned')}</Badge>
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
  )
}

function UpcomingBucket({ agenda }: { agenda: RoleAgenda }) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  return (
    <section aria-label={t('calendar.sidebar.upcomingTitle')}>
      <h3 className="font-display text-base text-foreground">
        {t('calendar.sidebar.upcomingTitle')}
      </h3>
      {agenda.upcoming.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t('calendar.sidebar.upcomingEmpty')}</p>
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
  )
}

/** A quiet caught-up state — a check + one line, never a blank section (ADR-0044). */
function CaughtUp({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 text-sm">
      <Check
        className="mt-0.5 size-4 shrink-0 text-brand-green-700 dark:text-brand-green-300"
        aria-hidden="true"
      />
      <span>
        <span className="font-medium text-foreground">{title}</span>{' '}
        <span className="text-muted-foreground">{body}</span>
      </span>
    </div>
  )
}

/**
 * The banner compression (ADR-0044): the one row the role acts on, shown above
 * the canvas below the `lg` split. Full buckets still follow the canvas.
 */
function AgendaBanner({ agenda }: { agenda: RoleAgenda }) {
  const { t } = useTranslation()

  if (agenda.role === 'teacher') {
    const total = agenda.worklist.reduce((sum, g) => sum + g.count, 0)
    const oldest = agenda.worklist[0]
    return (
      <BannerShell>
        {total === 0 || !oldest ? (
          <BannerCaughtUp label={t('calendar.sidebar.teacher.caughtUpTitle')} />
        ) : (
          <Link
            to={markHref(oldest.courseId, oldest.oldestDate)}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-green-700 hover:underline dark:text-brand-green-300"
          >
            {t('calendar.sidebar.teacher.sessionsToMark', { count: total })}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </BannerShell>
    )
  }

  if (agenda.role === 'admin') {
    const { unmarkedCount, coursesToCloseCount } = agenda.pulse
    if (unmarkedCount === 0 && coursesToCloseCount === 0) {
      return (
        <BannerShell>
          <BannerCaughtUp label={t('calendar.sidebar.admin.unmarkedNone')} />
        </BannerShell>
      )
    }
    return (
      <BannerShell>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          {unmarkedCount > 0 && (
            <Link
              to="/app/attendance"
              className="inline-flex items-center gap-1 font-medium text-brand-green-700 hover:underline dark:text-brand-green-300"
            >
              {t('calendar.sidebar.admin.unmarked', { count: unmarkedCount })}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
          {coursesToCloseCount > 0 && (
            <Link
              to="/app/courses"
              className="inline-flex items-center gap-1 font-medium text-brand-green-700 hover:underline dark:text-brand-green-300"
            >
              {t('calendar.sidebar.admin.coursesToClose', { count: coursesToCloseCount })}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </BannerShell>
    )
  }

  if (agenda.role === 'student') {
    const onTrack = agenda.progress.filter((r) => r.total > 0 && r.onTrack).length
    const tracked = agenda.progress.filter((r) => r.total > 0).length
    return (
      <BannerShell>
        <span className="text-sm text-foreground">
          {t('calendar.sidebar.student.bannerOnTrack', { onTrack, total: tracked })}
        </span>
      </BannerShell>
    )
  }

  // tcu: the next upcoming Session, or a quiet nothing-on-deck.
  const next = agenda.upcoming[0]
  return (
    <BannerShell>
      <span className="text-sm text-foreground">
        {next
          ? t('calendar.sidebar.tcu.bannerNext', { course: next.courseName })
          : t('calendar.sidebar.upcomingEmpty')}
      </span>
    </BannerShell>
  )
}

function BannerShell({ children }: { children: React.ReactNode }) {
  // The one-row compression above the canvas keeps its tight px-4 py-3 rather
  // than adopting stock Card padding — it's a banner, not a stacked card.
  return <Card className="gap-0 px-4 py-3">{children}</Card>
}

/** The banner's one-line caught-up variant — a check + the good-news word. */
function BannerCaughtUp({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <Check className="size-4 text-brand-green-700 dark:text-brand-green-300" aria-hidden="true" />
      {label}
    </span>
  )
}
