import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { StatCard } from '@/components/shared/StatCard'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useFormat } from '@/hooks/useFormat'

export interface StatRowProps {
  totalStudents: number
  activeCourses: number
  certsIssued: number
  tcuHours: number
}

export function StatRow({ totalStudents, activeCourses, certsIssued, tcuHours }: StatRowProps) {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const numberFormat = (n: number) => formatNumber(Math.round(n))
  const stats = [
    { key: 'students', label: t('dashboard.stats.students'), value: totalStudents },
    { key: 'activeCourses', label: t('dashboard.stats.activeCourses'), value: activeCourses },
    { key: 'certs', label: t('dashboard.stats.certificatesIssued'), value: certsIssued },
    { key: 'tcuHours', label: t('dashboard.stats.tcuHours'), value: tcuHours },
  ]

  return (
    // Columns follow the row's own width, not the viewport, so the four tiles
    // wrap to two before they squeeze.
    <div className="@container">
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @3xl:grid-cols-4">
        {stats.map((stat) => (
          <motion.div
            key={stat.key}
            className="h-full"
            variants={fadeUp}
            transition={transitionDefaults}
          >
            <StatCard label={stat.label} value={stat.value} format={numberFormat} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
