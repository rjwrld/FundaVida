import { useState } from 'react'
import { motion } from 'framer-motion'
import { isSameDay, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Clock, GraduationCap, ListChecks, MapPin, CalendarDays } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useTcuActivities, useTcuTrainees, useCourses, useSessionExceptions } from '@/hooks/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { WorklistCard } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { LogTcuActivityDialog } from '@/components/tcu/LogTcuActivityDialog'
import { TcuActivityLog } from '@/components/tcu/TcuActivityLog'
import { resolveQueries } from '@/lib/resolveQueries'
import { effectiveSessions, upcomingSessions } from '@/lib/sessions'
import { tcuHoursByStatus, TCU_TARGET_HOURS } from '@/lib/tcuHours'
import { clock } from '@/lib/clock'
import { useFormat } from '@/hooks/useFormat'
import { DashboardAnnouncementsFeed } from './DashboardAnnouncementsFeed'
import { DashboardShell } from './DashboardShell'

/**
 * The TCU trainee's home (ADR-0036, recomposed by ADR-0050): the assigned
 * Course with its next Session, one approved-hours progress bar (pending named
 * beside it), and Log hours as the one primary action; then the full activity
 * log, newest first; then that Course's slim announcements feed. No agenda
 * aside — the course card already says when the next Session is.
 */
export function TcuDashboard() {
  const { t } = useTranslation()
  const { formatDate, formatNumber } = useFormat()
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  // The dashboard derives its verdict from four scoped reads: the trainee's own
  // activities, their trainee record (the 'assigned' Course pivot), the scoped
  // Courses (exactly the one Course they serve at, ADR-0036), and that Course's
  // Session exceptions (ADR-0039). Gate on all four (ADR-0030) so a default-`[]`
  // window can never flash a "no course assigned" state or a cancelled "Today".
  const activitiesQuery = useTcuActivities()
  const traineesQuery = useTcuTrainees()
  const coursesQuery = useCourses()
  const exceptionsQuery = useSessionExceptions()
  const gate = resolveQueries([activitiesQuery, traineesQuery, coursesQuery, exceptionsQuery])

  if (gate.isPending) {
    // Mirror the loaded layout — the course card, the activity table, the feed —
    // so resolving the gate doesn't shift the page.
    return (
      <DashboardShell sectionTitle={t('dashboard.tcu.sectionTitle')}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={5} />
        <SkeletonCard lines={3} />
      </DashboardShell>
    )
  }

  const [activities, trainees, courses, sessionExceptions] = gate.data

  // Approved-only progress, matching TcuListPage via the shared split — the
  // divergence ADR-0036 fixes (the old dashboard summed ALL hours). Pending
  // hours are named beside it, never folded in.
  const { approved: approvedHours, pending: pendingHours } = tcuHoursByStatus(activities)
  const progressLine = [
    t('dashboard.tcu.progressApproved', {
      approved: formatNumber(approvedHours),
      target: TCU_TARGET_HOURS,
    }),
    pendingHours > 0
      ? t('dashboard.tcu.progressPending', { pending: formatNumber(pendingHours) })
      : null,
  ]
    .filter(Boolean)
    .join(' · ')
  const progress = (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium tabular-nums text-foreground">{progressLine}</p>
      <Progress
        value={Math.min((approvedHours / TCU_TARGET_HOURS) * 100, 100)}
        className="h-2"
        aria-label={t('tcu.progressAria', {
          approved: formatNumber(approvedHours),
          target: TCU_TARGET_HOURS,
        })}
      />
    </div>
  )

  // Both reads are already scoped to the current volunteer by the seam: trainees
  // to 'self', courses to 'assigned' (ADR-0033) — so the component trusts them
  // rather than re-filtering by userId. The trainee record is the presence signal
  // for the course card.
  const trainee = trainees[0] ?? null
  const assignedCourse = trainee ? (courses[0] ?? null) : null
  // Today's Session is recordable, not upcoming (ADR-0034), so upcomingSessions
  // skips it; on a session day the volunteer serves today, and the hero says so.
  // Both read the exceptions overlay (ADR-0039): a cancelled Session is not
  // "Today", and one rescheduled onto today is.
  const today = clock.today()
  const sessionToday = assignedCourse
    ? effectiveSessions(assignedCourse, sessionExceptions).some((s) =>
        isSameDay(parseISO(s.date), today)
      )
    : false
  const nextSession = assignedCourse
    ? (upcomingSessions([assignedCourse], today, 1, sessionExceptions)[0] ?? null)
    : null
  const meetingDays = assignedCourse
    ? assignedCourse.meetingDays.map((d) => t(`courses.form.weekdays.${d}`)).join(', ')
    : ''

  return (
    <DashboardShell sectionTitle={t('dashboard.tcu.sectionTitle')}>
      {/* Hero: the assigned Course — where the volunteer serves (ADR-0036) — with
          the hours progress and the role's one primary action, Log hours. */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        {assignedCourse ? (
          <Card>
            <CardHeader>
              <CardDescription>{t('dashboard.tcu.assignedCourse')}</CardDescription>
              <CardTitle as="h3" className="flex items-center gap-2">
                <GraduationCap
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                {assignedCourse.name}
              </CardTitle>
              <CardAction>
                <Button size="sm" onClick={() => setLogDialogOpen(true)}>
                  {t('dashboard.tcu.logHours')}
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-3.5" aria-hidden="true" />
                  <dt className="sr-only">{t('dashboard.tcu.sedeLabel')}</dt>
                  <dd className="text-foreground">{assignedCourse.sede}</dd>
                </div>
                {meetingDays && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    <dt className="sr-only">{t('dashboard.tcu.meetingDaysLabel')}</dt>
                    <dd className="text-foreground">{meetingDays}</dd>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden="true" />
                  <dt className="sr-only">{t('dashboard.tcu.nextSessionLabel')}</dt>
                  <dd className="text-foreground">
                    {sessionToday
                      ? `${t('dashboard.tcu.nextSessionLabel')}: ${t('dashboard.tcu.sessionToday')}`
                      : nextSession
                        ? `${t('dashboard.tcu.nextSessionLabel')}: ${formatDate(nextSession.date)}`
                        : t('dashboard.tcu.noUpcomingSessions')}
                  </dd>
                </div>
              </dl>
              {progress}
            </CardContent>
          </Card>
        ) : (
          // No trainee record breaks the seed invariant (ADR-0017): show the
          // hours alone rather than crash or flash a bogus course card.
          <Card>
            <CardContent>{progress}</CardContent>
          </Card>
        )}
      </motion.div>

      {/* The full activity log, newest first (one table, paginated). */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <WorklistCard
          title={t('dashboard.tcu.activities')}
          icon={ListChecks}
          emptyLabel={t('dashboard.tcu.noActivities')}
          body={activities.length > 0 ? <TcuActivityLog activities={activities} /> : undefined}
        />
      </motion.div>

      {/* The assigned Course's announcements (ADR-0040), slimmed (ADR-0050). */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <DashboardAnnouncementsFeed courseId={assignedCourse?.id} />
      </motion.div>

      <LogTcuActivityDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />
    </DashboardShell>
  )
}
