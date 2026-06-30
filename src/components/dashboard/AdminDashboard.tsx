import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { GraduationCap, HeartHandshake } from 'lucide-react'
import { WelcomeBanner } from '@/components/shared/WelcomeBanner'
import { type UpcomingItem } from '@/components/shared/UpcomingList'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useDashboardStats } from '@/hooks/api/useDashboardStats'
import { useStore } from '@/data/store'
import { StatRow } from './StatRow'
import { RecentActivity } from './RecentActivity'
import { TopCourses } from './TopCourses'
import { AttendanceSnapshot } from './AttendanceSnapshot'
import { DashboardShell } from './DashboardShell'

export function AdminDashboard() {
  const { t } = useTranslation()
  const stats = useDashboardStats()
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
  const courses = useStore((s) => s.courses)
  const programs = useStore((s) => s.programs)

  // Build courseCapacities map for TopCourses (enrollment vs capacity).
  const courseCapacities = useMemo(() => {
    const capacities: Record<string, number> = {}
    courses.forEach((c) => {
      capacities[c.id] = c.capacity
    })
    return capacities
  }, [courses])

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

  const greetingName = t('dashboard.recentActivity.actor.admin')

  // Admin sees every Sede's Courses; the sidebar calendar marks their Session days.
  // Hero: Org Health Stats (total students, active courses, certs, tcu hours)
  // Supporting: Recent Activity, Top Courses (with capacity), Attendance Snapshot
  return (
    <DashboardShell courses={courses} upcoming={upcoming}>
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <WelcomeBanner
          eyebrow={t('dashboard.welcome.eyebrow')}
          greeting={t('dashboard.welcome.greeting', { name: greetingName })}
          context={t('dashboard.welcome.context')}
        />
      </motion.div>

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

      {/* Supporting: Recent Activity, Top Courses, Attendance */}
      <motion.div
        variants={fadeUp}
        transition={transitionDefaults}
        className="grid gap-4 lg:grid-cols-2"
      >
        <RecentActivity entries={stats.recentActivity} />
        <TopCourses courses={stats.topCourses} courseCapacities={courseCapacities} />
        <AttendanceSnapshot ratePct={stats.attendanceRate} trend={stats.attendanceTrend} />
      </motion.div>
    </DashboardShell>
  )
}
