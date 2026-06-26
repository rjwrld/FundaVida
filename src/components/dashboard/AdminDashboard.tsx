import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, GraduationCap, HeartHandshake } from 'lucide-react'
import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { type UpcomingItem } from '@/components/shared/UpcomingList'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useDashboardStats } from '@/hooks/api/useDashboardStats'
import { useStore } from '@/data/store'
import { StatRow } from './StatRow'
import { RecentActivity } from './RecentActivity'
import { TopCourses } from './TopCourses'
import { PendingApprovals } from './PendingApprovals'
import { AttendanceSnapshot } from './AttendanceSnapshot'
import { DashboardShell } from './DashboardShell'

export function AdminDashboard() {
  const { t } = useTranslation()
  const stats = useDashboardStats()
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
  const courses = useStore((s) => s.courses)

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

  const ctaLabel = t('dashboard.welcome.cta')
  const greetingName = t('dashboard.recentActivity.actor.admin')

  // Admin sees every Sede's Courses; Session entries link into attendance (ADR-0013).
  return (
    <DashboardShell courses={courses} linkSessions upcoming={upcoming}>
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
        />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatRow
          totalStudents={stats.totalStudents}
          activeCourses={stats.activeCourses}
          certsIssued={stats.certsIssued}
          tcuHours={stats.tcuHours}
          deltas={stats.deltas}
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
    </DashboardShell>
  )
}
