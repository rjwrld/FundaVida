import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useDashboardStats } from '@/hooks/api/useDashboardStats'
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

  // Admin sees every Sede's Courses; the sidebar calendar marks their Session days.
  // Hero: Org Health Stats (total students, active courses, certs, tcu hours)
  // Supporting: role-scoped, actionable cards — each reads a scoped hook, never
  // the raw store (issue #155), and links to where the work gets done.
  return (
    <DashboardShell sectionTitle={t('dashboard.stats.sectionTitle')}>
      {/* Hero: Org Health Stats. */}
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
        {/* First row mirrors the approved phase-5 screenshot: the funnel chart
            beside the close worklist. */}
        <EnrollmentFunnelBySede />
        <CoursesToClose />
        <AtRiskStudents />
        <CertsThisEpoch />
        <div className="lg:col-span-2">
          <DashboardAnnouncementsFeed />
        </div>
      </motion.div>
    </DashboardShell>
  )
}
