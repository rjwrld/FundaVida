import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { DashboardShell } from './DashboardShell'
import { AgendaSlice } from './AgendaSlice'
import { NeedsMarkingWorklist } from './NeedsMarkingWorklist'
import { CoursesToClose } from './CoursesToClose'
import { DashboardAnnouncementsFeed } from './DashboardAnnouncementsFeed'
import { TcuApprovalQueue } from '@/components/tcu/TcuApprovalQueue'
import { EnrollmentApprovalQueue } from '@/components/enrollments/EnrollmentApprovalQueue'

/**
 * The Teacher's dashboard (ADR-0043, recomposed by ADR-0050): one column of
 * worklists in the order the work is due — Sessions that need marking, Courses
 * ready to close (ADR-0024), the approval queues the Teacher owns (enrollment
 * requests + TCU hours) — then the slim announcements feed with its Post entry
 * (ADR-0040). The aside keeps only the next three Sessions. There is no
 * "My courses" card: the Courses page is already teacher-scoped.
 */
export function TeacherDashboard() {
  const { t } = useTranslation()

  return (
    <DashboardShell aside={<AgendaSlice />} sectionTitle={t('dashboard.teacher.sectionTitle')}>
      {/* Worklists first — the time-sensitive jobs. The table-backed approval
          queues keep the full width (their columns overflow a half column). */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <NeedsMarkingWorklist />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <CoursesToClose />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <EnrollmentApprovalQueue />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <TcuApprovalQueue />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <DashboardAnnouncementsFeed />
      </motion.div>
    </DashboardShell>
  )
}
