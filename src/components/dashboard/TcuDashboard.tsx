import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock, GraduationCap, MapPin, CalendarDays } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useTcuActivities, useTcuTrainees, useCourses } from '@/hooks/api'
import { StatCard } from '@/components/shared/StatCard'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
      <DashboardShell sectionTitle={t('dashboard.tcu.sectionTitle')}>
        <SkeletonCard lines={4} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <SkeletonCard lines={3} />
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
    <DashboardShell sectionTitle={t('dashboard.tcu.sectionTitle')}>
      {/* Hero: the assigned Course — where the volunteer serves (ADR-0036). */}
      {assignedCourse && (
        <motion.div variants={fadeUp} transition={transitionDefaults}>
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-2">
                <GraduationCap className="size-4 text-primary" aria-hidden="true" />
                <div>
                  <CardDescription>{t('dashboard.tcu.assignedCourse')}</CardDescription>
                  <CardTitle as="h3">{assignedCourse.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <dl className="flex flex-col gap-2 text-sm">
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
            </CardContent>
            <CardFooter>
              <Button variant="default" size="sm" onClick={() => setLogDialogOpen(true)}>
                {t('dashboard.tcu.logHours')}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}

      {/* The hour stats as one stat row (stock section-card composition):
          approved-only progress toward the 300-hour target, with pending hours
          shown separately, not folded into progress (ADR-0036). */}
      <motion.div
        variants={fadeUp}
        transition={transitionDefaults}
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <StatCard
          label={t('dashboard.tcu.hoursCompleted')}
          value={approvedHours}
          format={(v) => `${v}h`}
        />
        <StatCard
          label={t('dashboard.tcu.hoursRemaining')}
          value={remainingHours}
          format={(v) => `${v}h`}
        />
        <StatCard
          label={t('tcu.dashboard.pendingHours')}
          value={pendingHours}
          format={(v) => `${v}h`}
        />
      </motion.div>

      {/* Supporting pair: the assigned Course's announcements (ADR-0040/0043)
          and the recent activities list. */}
      <motion.div
        variants={fadeUp}
        transition={transitionDefaults}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <DashboardAnnouncementsFeed courseId={assignedCourse?.id} />
        <TcuActivityList activities={activities} />
      </motion.div>

      <LogTcuActivityDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />
    </DashboardShell>
  )
}
