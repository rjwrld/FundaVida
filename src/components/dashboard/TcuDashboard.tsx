import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useTcuActivities } from '@/hooks/api'
import { StatCard } from '@/components/shared/StatCard'
import { TcuActivityList } from './TcuActivityList'
import type { Variants } from 'framer-motion'

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const TARGET_HOURS = 300

export function TcuDashboard() {
  const { t } = useTranslation()
  // Read the trainee's OWN activities through the scope seam (ADR-0008): for the
  // tcu role api.tcu.list already filters to traineeId === current user, so these
  // numbers derive from the same scoped source TcuListPage shows — never a raw,
  // unscoped store read re-filtered here (issue #74, criterion 2).
  const { data: myActivities = [] } = useTcuActivities()

  const totalHours = myActivities.reduce((sum, a) => sum + a.hours, 0)
  const remainingHours = Math.max(0, TARGET_HOURS - totalHours)

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="grid gap-6">
      {/* Hero: Hours Completed and Remaining */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.tcu.hoursCompleted')}
          value={totalHours}
          format={(v) => `${v}h`}
          icon={<Clock className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.tcu.hoursRemaining')}
          value={remainingHours}
          format={(v) => `${v}h`}
          icon={<Clock className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Supporting: Recent Activities List */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <TcuActivityList activities={myActivities} />
      </motion.div>
    </motion.div>
  )
}
