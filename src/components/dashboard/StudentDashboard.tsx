import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Book, CheckCircle2 } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useCourses } from '@/hooks/api/courses'
import { useAttendance } from '@/hooks/api/attendance'
import { StatCard } from '@/components/shared/StatCard'
import { parseISO, startOfDay, startOfMonth } from 'date-fns'
import { DashboardShell } from './DashboardShell'

export function StudentDashboard() {
  const { t } = useTranslation()
  const { data: courses = [] } = useCourses()
  const { data: attendance = [] } = useAttendance()

  // Calculate attendance rate for this month
  const attendanceRate = useMemo(() => {
    const today = new Date()
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

  // A Student's calendar entries are read-only — they view Sessions, never mark
  // attendance (ADR-0012), so linkSessions stays false.
  return (
    <DashboardShell courses={courses} linkSessions={false}>
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
    </DashboardShell>
  )
}
