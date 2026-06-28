import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Book, CheckCircle2, Search } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useCourses } from '@/hooks/api/courses'
import { useAttendance } from '@/hooks/api/attendance'
import { StatCard } from '@/components/shared/StatCard'
import { parseISO, startOfDay, startOfMonth } from 'date-fns'
import { clock } from '@/lib/clock'
import { DashboardShell } from './DashboardShell'

export function StudentDashboard() {
  const { t } = useTranslation()
  const { data: courses = [] } = useCourses()
  const { data: attendance = [] } = useAttendance()

  // Calculate attendance rate for this month
  const attendanceRate = useMemo(() => {
    const today = clock.today()
    const monthStart = startOfMonth(today)
    const monthRecords = attendance.filter((a) => {
      const sessionDate = parseISO(a.sessionDate)
      return startOfDay(sessionDate) >= monthStart
    })

    if (monthRecords.length === 0) return 0
    return Math.round(
      (monthRecords.filter((a) => a.status === 'present').length / monthRecords.length) * 100
    )
  }, [attendance])

  // The sidebar calendar marks the Student's enrolled Courses' Session days (ADR-0013).
  return (
    <DashboardShell courses={courses}>
      {/* My Courses */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.student.myCourses')}
          value={courses.length}
          icon={<Book className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Attendance Rate */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.student.attendanceRate')}
          value={attendanceRate}
          format={(v) => `${v}%`}
          icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Browse open courses to request a spot (ADR-0016) */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <Link
          to="/app/courses/browse"
          className="inline-flex items-center gap-2 rounded-lg border border-foreground bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Search className="size-4" aria-hidden="true" />
          {t('courses.browse.title')}
        </Link>
      </motion.div>
    </DashboardShell>
  )
}
