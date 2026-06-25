import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Clock, Activity } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useStore } from '@/data/store'
import { StatCard } from '@/components/shared/StatCard'
import type { Variants } from 'framer-motion'

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

const TCU_REQUIRED_HOURS = 300

export function TcuDashboard() {
  const { t } = useTranslation()
  const currentUserId = useStore((s) => s.currentUserId)
  const tcuActivities = useStore((s) => s.tcuActivities)

  // Filter to only this trainee's activities
  const myActivities = useMemo(() => {
    return tcuActivities.filter((a) => a.traineeId === currentUserId)
  }, [tcuActivities, currentUserId])

  // Calculate total hours and hours remaining
  const totalHours = useMemo(() => {
    return myActivities.reduce((sum, a) => sum + a.hours, 0)
  }, [myActivities])

  const remainingHours = Math.max(0, TCU_REQUIRED_HOURS - totalHours)

  // Get count of recent activities (last 5)
  const recentActivitiesCount = Math.min(myActivities.length, 5)

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="grid gap-6">
      {/* Hours Completed */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.tcu.hoursCompleted')}
          value={totalHours}
          format={(v) => `${v}h`}
          icon={<Clock className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Hours Remaining */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.tcu.hoursRemaining')}
          value={remainingHours}
          format={(v) => `${v}h`}
          icon={<Clock className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Recent Activities */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.tcu.recentActivities')}
          value={recentActivitiesCount}
          icon={<Activity className="size-4" aria-hidden="true" />}
        />
      </motion.div>
    </motion.div>
  )
}
