import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, staggerContainer, transitionDefaults } from '@/lib/motion'
import { NumberTicker } from './NumberTicker'

const stats = [
  { key: 'modules', value: 8 },
  { key: 'locales', value: 2 },
  { key: 'tests', value: 167 },
  { key: 'backends', value: 0 },
]

export function TrustStrip() {
  const { t } = useTranslation()
  return (
    <section className="border-y border-border bg-muted/30 py-16">
      <div className="container mx-auto px-6 lg:px-10">
        <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
          {t('landing.trustStrip.headline')}
        </h2>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-4"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.key}
              variants={fadeUp}
              transition={transitionDefaults}
              className="text-center"
            >
              <NumberTicker value={stat.value} className="font-display text-5xl text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                {t(`landing.trustStrip.stat.${stat.key}`)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
