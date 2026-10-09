import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { DashboardShell } from './DashboardShell'
import { AgendaSlice } from './AgendaSlice'
import { StudentCoursesTable } from './StudentCoursesTable'
import { DashboardAnnouncementsFeed } from './DashboardAnnouncementsFeed'

/**
 * The Student's content-first landing surface (ADR-0043, ADR-0050): the "My
 * courses" roll-up (buildStudentProgress, ADR-0032) answering "how am I doing
 * where" — attendance, grade, certificate — and the slim announcements feed
 * across their enrolled Courses. The aside holds only the next three Sessions
 * ({@link AgendaSlice}); per-Course progress lives in the table, not beside it.
 */
export function StudentDashboard() {
  const { t } = useTranslation()

  return (
    <DashboardShell aside={<AgendaSlice />} sectionTitle={t('dashboard.student.sectionTitle')}>
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StudentCoursesTable />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <DashboardAnnouncementsFeed />
      </motion.div>
    </DashboardShell>
  )
}
