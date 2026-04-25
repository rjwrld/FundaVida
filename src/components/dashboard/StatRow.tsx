import { useTranslation } from 'react-i18next'
import { Award, Clock, GraduationCap, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '@/components/shared/StatCard'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useFormat } from '@/hooks/useFormat'

export interface StatRowProps {
  totalStudents: number
  activeCourses: number
  certsIssued: number
  tcuHours: number
  studentsSparkline?: number[]
}

export function StatRow({
  totalStudents,
  activeCourses,
  certsIssued,
  tcuHours,
  studentsSparkline,
}: StatRowProps) {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const vsLastMonth = t('dashboard.stats.vsLastMonth')
  const numberFormat = (n: number) => formatNumber(Math.round(n))

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          variant="primary"
          label={t('dashboard.stats.students')}
          value={totalStudents}
          format={numberFormat}
          icon={<Users className="size-4" aria-hidden="true" />}
          delta={{ value: 0.08, label: vsLastMonth }}
          sparkline={studentsSparkline}
        />
      </motion.div>
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.stats.activeCourses')}
          value={activeCourses}
          format={numberFormat}
          icon={<GraduationCap className="size-4" aria-hidden="true" />}
          delta={{ value: 0.03, label: vsLastMonth }}
        />
      </motion.div>
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.stats.certificatesIssued')}
          value={certsIssued}
          format={numberFormat}
          icon={<Award className="size-4" aria-hidden="true" />}
          delta={{ value: 0.12, label: vsLastMonth }}
        />
      </motion.div>
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.stats.tcuHours')}
          value={tcuHours}
          format={numberFormat}
          icon={<Clock className="size-4" aria-hidden="true" />}
          delta={{ value: -0.02, label: vsLastMonth }}
        />
      </motion.div>
    </div>
  )
}
