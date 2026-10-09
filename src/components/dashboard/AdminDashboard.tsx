import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useDashboardStats } from '@/hooks/api/useDashboardStats'
import { StatRow } from './StatRow'
import { CoursesToClose } from './CoursesToClose'
import { AtRiskStudents } from './AtRiskStudents'
import { EnrollmentApprovalQueue } from '@/components/enrollments/EnrollmentApprovalQueue'
import { TcuApprovalQueue } from '@/components/tcu/TcuApprovalQueue'
import { DashboardShell } from './DashboardShell'

const QUEUE_ROWS = 5

/**
 * The admin's dashboard (ADR-0050): four plain org numbers, then the admin's
 * real pending work in the order it should be done — enrollment requests, TCU
 * hours, Courses to close, Students at risk. Every card reads a scoped hook,
 * never the raw store (issue #155), and links to where the work gets done. No
 * agenda aside and no announcements feed: the admin has no session to attend
 * and no class to read to, so the main column takes the full width.
 */
export function AdminDashboard() {
  const { t } = useTranslation()
  const stats = useDashboardStats()

  return (
    <DashboardShell sectionTitle={t('dashboard.stats.sectionTitle')}>
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatRow
          totalStudents={stats.totalStudents}
          activeCourses={stats.activeCourses}
          certsIssued={stats.certsIssued}
          tcuHours={stats.tcuHours}
        />
      </motion.div>

      {/* The table-backed approval queues keep the full width, capped to their five
          longest-waiting rows so the close and at-risk worklists stay in view; each
          links to its full page. */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <EnrollmentApprovalQueue limit={{ rows: QUEUE_ROWS, viewAllTo: '/app/enrollments' }} />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <TcuApprovalQueue limit={{ rows: QUEUE_ROWS, viewAllTo: '/app/tcu' }} />
      </motion.div>

      <motion.div
        variants={fadeUp}
        transition={transitionDefaults}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <CoursesToClose />
        <AtRiskStudents />
      </motion.div>
    </DashboardShell>
  )
}
