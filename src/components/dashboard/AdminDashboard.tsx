import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { GraduationCap, HeartHandshake } from 'lucide-react'
import { type UpcomingItem } from '@/components/shared/UpcomingList'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useDashboardStats } from '@/hooks/api/useDashboardStats'
import { useStore } from '@/data/store'
import { StatRow } from './StatRow'
import { CoursesToClose } from './CoursesToClose'
import { CertsThisEpoch } from './CertsThisEpoch'
import { AtRiskStudents } from './AtRiskStudents'
import { EnrollmentFunnelBySede } from './EnrollmentFunnelBySede'
import { DashboardAnnouncementsFeed } from './DashboardAnnouncementsFeed'
import { DashboardShell } from './DashboardShell'

export function AdminDashboard() {
  const { t } = useTranslation()
  const stats = useDashboardStats()
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
  const courses = useStore((s) => s.courses)
  const programs = useStore((s) => s.programs)

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const items: UpcomingItem[] = []
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const programById = new Map(programs.map((p) => [p.id, p]))
    const gradedKeys = new Set(grades.map((g) => `${g.studentId}:${g.courseId}`))

    const ungraded = enrollments.filter((e) => !gradedKeys.has(`${e.studentId}:${e.courseId}`))
    ungraded.slice(0, 2).forEach((e) => {
      const course = courseById.get(e.courseId)
      items.push({
        id: `up-grade-${e.id}`,
        title: t('dashboard.upcoming.gradePending', { course: course?.name ?? e.courseId }),
        subtitle: course ? programById.get(course.programId)?.name : undefined,
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
  }, [enrollments, grades, courses, programs, stats.recentTcu, t])

  // Admin sees every Sede's Courses; the sidebar calendar marks their Session days.
  // Hero: Org Health Stats (total students, active courses, certs, tcu hours)
  // Supporting: role-scoped, actionable cards — each reads a scoped hook, never
  // the raw store (issue #155), and links to where the work gets done.
  return (
    <DashboardShell upcoming={upcoming}>
      {/* Hero: Org Health Stats */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatRow
          totalStudents={stats.totalStudents}
          activeCourses={stats.activeCourses}
          certsIssued={stats.certsIssued}
          tcuHours={stats.tcuHours}
          deltas={stats.deltas}
        />
      </motion.div>

      {/* Supporting: actionable, role-scoped cards */}
      <motion.div
        variants={fadeUp}
        transition={transitionDefaults}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <CoursesToClose />
        <CertsThisEpoch />
        <AtRiskStudents />
        <EnrollmentFunnelBySede />
        <DashboardAnnouncementsFeed />
      </motion.div>
    </DashboardShell>
  )
}
