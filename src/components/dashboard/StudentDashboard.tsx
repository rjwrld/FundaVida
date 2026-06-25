import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Book, CheckCircle2 } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useCourses } from '@/hooks/api/courses'
import { useAttendance } from '@/hooks/api/attendance'
import { StatCard } from '@/components/shared/StatCard'
import { parseISO, startOfDay, startOfMonth } from 'date-fns'
import type { Variants } from 'framer-motion'

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

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

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="grid gap-6">
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
    </motion.div>
  )
}
