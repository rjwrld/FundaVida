import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock, GraduationCap, MapPin, CalendarDays } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useTcuActivities, useTcuTrainees, useCourses } from '@/hooks/api'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { SkeletonStatCard } from '@/components/shared/skeletons/SkeletonStatCard'
import { LogTcuActivityDialog } from '@/components/tcu/LogTcuActivityDialog'
import { resolveQueries } from '@/lib/resolveQueries'
import { upcomingSessions } from '@/lib/sessions'
import { tcuHoursByStatus, TCU_TARGET_HOURS } from '@/lib/tcuHours'
import { clock } from '@/lib/clock'
import { useFormat } from '@/hooks/useFormat'
import { TcuActivityList } from './TcuActivityList'
import { DashboardAnnouncementsFeed } from './DashboardAnnouncementsFeed'
import { DashboardShell } from './DashboardShell'

export function TcuDashboard() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const [logDialogOpen, setLogDialogOpen] = useState(false)

  // The dashboard derives its verdict from three scoped reads: the trainee's own
  // activities, their trainee record (the 'assigned' Course pivot), and the
  // scoped Courses (exactly the one Course they serve at, ADR-0036). Gate on all
  // three (ADR-0030) so a default-`[]` window can never flash a "no course
  // assigned" state before the Courses query resolves.
  const activitiesQuery = useTcuActivities()
  const traineesQuery = useTcuTrainees()
  const coursesQuery = useCourses()
  const gate = resolveQueries([activitiesQuery, traineesQuery, coursesQuery])

  if (gate.isPending) {
    // Mirror the loaded happy-path layout — course card, three stat cards, and
    // the activity list — so resolving the gate doesn't shift the page.
    return (
      <DashboardShell>
        <div className="grid grid-cols-1 gap-6">
          <SkeletonCard lines={4} />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonCard lines={3} />
        </div>
      </DashboardShell>
    )
  }

  const [activities, trainees, courses] = gate.data

  // Approved-only progress, matching TcuListPage via the shared split — the
  // divergence ADR-0036 fixes (the old dashboard summed ALL hours). Pending
  // hours are surfaced separately.
  const { approved: approvedHours, pending: pendingHours } = tcuHoursByStatus(activities)
  const remainingHours = Math.max(0, TCU_TARGET_HOURS - approvedHours)

  // Both reads are already scoped to the current volunteer by the seam: trainees
  // to 'self', courses to 'assigned' (ADR-0033) — so the component trusts them
  // rather than re-filtering by userId. The trainee record is the presence signal
  // for the course card: with no record the seed invariant (ADR-0017) is broken,
  // so we render the hours stats alone rather than crash or flash a bogus card.
  const trainee = trainees[0] ?? null
  const assignedCourse = trainee ? (courses[0] ?? null) : null
  const nextSession = assignedCourse
    ? (upcomingSessions([assignedCourse], clock.today(), 1)[0] ?? null)
    : null
  const meetingDays = assignedCourse
    ? assignedCourse.meetingDays.map((d) => t(`courses.form.weekdays.${d}`)).join(', ')
    : ''

  return (
    <DashboardShell>
      {/* Hero: the assigned Course — where the volunteer serves (ADR-0036). */}
      {assignedCourse && (
        <motion.div variants={fadeUp} transition={transitionDefaults}>
          <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
            <header className="mb-4 flex items-center gap-2">
              <GraduationCap
                className="size-4 text-brand-green-700 dark:text-brand-green-300"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs text-muted-foreground">{t('dashboard.tcu.assignedCourse')}</p>
                <h3 className="font-display text-lg text-foreground">{assignedCourse.name}</h3>
              </div>
            </header>
            <dl className="flex-1 space-y-2 text-sm">
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
                  {nextSession
                    ? `${t('dashboard.tcu.nextSessionLabel')}: ${formatDate(nextSession.date)}`
                    : t('dashboard.tcu.noUpcomingSessions')}
                </dd>
              </div>
            </dl>
            <div className="mt-4">
              <Button variant="default" size="sm" onClick={() => setLogDialogOpen(true)}>
                {t('dashboard.tcu.logHours')}
              </Button>
            </div>
          </article>
        </motion.div>
      )}

      {/* Hours completed (approved) toward the 300-hour target. */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.tcu.hoursCompleted')}
          value={approvedHours}
          format={(v) => `${v}h`}
          icon={<Clock className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.tcu.hoursRemaining')}
          value={remainingHours}
          format={(v) => `${v}h`}
          icon={<Clock className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Pending hours shown separately, not folded into progress (ADR-0036). */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('tcu.dashboard.pendingHours')}
          value={pendingHours}
          format={(v) => `${v}h`}
          icon={<Clock className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Supporting: the assigned Course's announcements (ADR-0040/0043). */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <DashboardAnnouncementsFeed courseId={assignedCourse?.id} />
      </motion.div>

      {/* Supporting: Recent Activities List */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <TcuActivityList activities={activities} />
      </motion.div>

      <LogTcuActivityDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />
    </DashboardShell>
  )
}
