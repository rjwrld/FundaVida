import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, CalendarDays, GraduationCap, HeartHandshake } from 'lucide-react'
import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { CalendarWidget } from '@/components/shared/CalendarWidget'
import { UpcomingList, type UpcomingItem } from '@/components/shared/UpcomingList'
import { FlameWelcome } from '@/components/icons/flame'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useDashboardStats } from '@/hooks/api/useDashboardStats'
import { useStore } from '@/data/store'
import type { Variants } from 'framer-motion'
import { StatRow } from './StatRow'
import { RecentActivity } from './RecentActivity'
import { TopCourses } from './TopCourses'
import { PendingApprovals } from './PendingApprovals'
import { AttendanceSnapshot } from './AttendanceSnapshot'

// Stagger 0.05s — alive but not busy. 0.06 felt slightly slow on a flagship view.
const adminStagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

export function AdminDashboard() {
  const { t } = useTranslation()
  const stats = useDashboardStats()
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
  const courses = useStore((s) => s.courses)

  const studentsSparkline = useMemo(() => {
    // Deterministic gentle upward trajectory derived from current totals.
    const base = stats.totalStudents
    if (base === 0) return [0, 0, 0, 0, 0, 0, 0]
    return [0.78, 0.82, 0.85, 0.88, 0.92, 0.96, 1].map((m) => Math.round(base * m))
  }, [stats.totalStudents])

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const items: UpcomingItem[] = []
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const gradedKeys = new Set(grades.map((g) => `${g.studentId}:${g.courseId}`))

    const ungraded = enrollments.filter((e) => !gradedKeys.has(`${e.studentId}:${e.courseId}`))
    ungraded.slice(0, 2).forEach((e) => {
      const course = courseById.get(e.courseId)
      items.push({
        id: `up-grade-${e.id}`,
        title: t('dashboard.upcoming.gradePending', { course: course?.name ?? e.courseId }),
        subtitle: course?.programName,
        variant: 'warning',
        icon: <GraduationCap className="size-4" aria-hidden="true" />,
      })
    })

    stats.recentTcu.slice(0, 2).forEach((tcu) => {
      items.push({
        id: `up-tcu-${tcu.id}`,
        title: t('dashboard.upcoming.tcuLogged', { title: tcu.title }),
        subtitle: `${tcu.hours}h`,
        variant: 'success',
        icon: <HeartHandshake className="size-4" aria-hidden="true" />,
      })
    })

    return items.slice(0, 4)
  }, [enrollments, grades, courses, stats.recentTcu, t])

  const calendarEvents = useMemo(() => {
    const dates: Date[] = []
    stats.recentActivity.forEach((entry) => dates.push(new Date(entry.timestamp)))
    stats.recentTcu.forEach((tcu) => dates.push(new Date(tcu.date)))
    return dates
  }, [stats.recentActivity, stats.recentTcu])

  const ctaLabel = t('dashboard.welcome.cta')
  const greetingName = t('dashboard.recentActivity.actor.admin')

  return (
    <motion.div
      variants={adminStagger}
      initial="hidden"
      animate="visible"
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="flex flex-col gap-6">
        <motion.div variants={fadeUp} transition={transitionDefaults}>
          <WelcomeBanner
            eyebrow={t('dashboard.welcome.eyebrow')}
            greeting={t('dashboard.welcome.greeting', { name: greetingName })}
            context={
              stats.pendingApprovals === 0
                ? t('dashboard.welcome.contextZero')
                : t('dashboard.welcome.context', { count: stats.pendingApprovals })
            }
            action={
              stats.pendingApprovals > 0 ? (
                <Link
                  to="/app/certificates?status=pending"
                  className="inline-flex items-center gap-1 rounded-md bg-brand-green-500 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-green-600"
                >
                  {ctaLabel}
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              ) : null
            }
            illustration={<FlameWelcome size={140} className="text-brand-green-500/85" />}
          />
        </motion.div>

        <motion.div variants={fadeUp} transition={transitionDefaults}>
          <StatRow
            totalStudents={stats.totalStudents}
            activeCourses={stats.activeCourses}
            certsIssued={stats.certsIssued}
            tcuHours={stats.tcuHours}
            studentsSparkline={studentsSparkline}
          />
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="grid gap-4 lg:grid-cols-2"
        >
          <RecentActivity entries={stats.recentActivity} />
          <TopCourses courses={stats.topCourses} />
          <PendingApprovals count={stats.pendingApprovals} />
          <AttendanceSnapshot ratePct={stats.attendanceRate} trend={stats.attendanceTrend} />
        </motion.div>
      </div>

      <motion.aside
        variants={fadeUp}
        transition={transitionDefaults}
        className="hidden flex-col gap-6 xl:flex"
        aria-label={t('dashboard.rightPanel.calendarTitle')}
      >
        <CalendarWidget selected={new Date()} events={calendarEvents} />
        <section className="rounded-xl border border-border bg-card p-5 shadow-card">
          <header className="mb-3 flex items-center gap-2">
            <CalendarDays className="size-4 text-brand-green-700" aria-hidden="true" />
            <h3 className="font-display text-base text-foreground">
              {t('dashboard.rightPanel.upcomingTitle')}
            </h3>
          </header>
          <UpcomingList items={upcoming} emptyLabel={t('dashboard.rightPanel.upcomingEmpty')} />
        </section>
      </motion.aside>
    </motion.div>
  )
}
