import { useTranslation } from 'react-i18next'
import { Award, Clock, GraduationCap, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard, type StatCardDelta } from '@/components/shared/StatCard'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useFormat } from '@/hooks/useFormat'
import type { StatDeltas } from '@/lib/stats'

export interface StatRowProps {
  totalStudents: number
  activeCourses: number
  certsIssued: number
  tcuHours: number
  /** Real month-over-month change per metric; `null` omits the trend chip. */
  deltas: StatDeltas
}

export function StatRow({
  totalStudents,
  activeCourses,
  certsIssued,
  tcuHours,
  deltas,
}: StatRowProps) {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const vsLastMonth = t('dashboard.stats.vsLastMonth')
  const trend = {
    up: t('dashboard.stats.trendUp'),
    down: t('dashboard.stats.trendDown'),
    flat: t('dashboard.stats.trendFlat'),
  }
  const numberFormat = (n: number) => formatNumber(Math.round(n))
  const deltaProp = (value: number | null): StatCardDelta | undefined =>
    value === null ? undefined : { value, label: vsLastMonth, trend }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <motion.div className="h-full" variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          variant="primary"
          label={t('dashboard.stats.students')}
          value={totalStudents}
          format={numberFormat}
          icon={<Users className="size-4" aria-hidden="true" />}
          delta={deltaProp(deltas.totalStudents)}
        />
      </motion.div>
      <motion.div className="h-full" variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.stats.activeCourses')}
          value={activeCourses}
          format={numberFormat}
          icon={<GraduationCap className="size-4" aria-hidden="true" />}
          delta={deltaProp(deltas.activeCourses)}
        />
      </motion.div>
      <motion.div className="h-full" variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.stats.certificatesIssued')}
          value={certsIssued}
          format={numberFormat}
          icon={<Award className="size-4" aria-hidden="true" />}
          delta={deltaProp(deltas.certsIssued)}
        />
      </motion.div>
      <motion.div className="h-full" variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.stats.tcuHours')}
          value={tcuHours}
          format={numberFormat}
          icon={<Clock className="size-4" aria-hidden="true" />}
          delta={deltaProp(deltas.tcuHours)}
        />
      </motion.div>
    </div>
  )
}
