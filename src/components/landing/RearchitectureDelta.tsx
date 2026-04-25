import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { transitionDefaults } from '@/lib/motion'

interface DeltaRow {
  before: string
  after: string
}

function isDeltaRowArray(value: unknown): value is DeltaRow[] {
  return (
    Array.isArray(value) &&
    value.every(
      (row) =>
        typeof row === 'object' &&
        row !== null &&
        typeof (row as DeltaRow).before === 'string' &&
        typeof (row as DeltaRow).after === 'string'
    )
  )
}

export function RearchitectureDelta() {
  const { t } = useTranslation()
  const raw = t('landing.rearchitecture.rows', { returnObjects: true })
  const rows = isDeltaRowArray(raw) ? raw : []
  const total = String(rows.length).padStart(2, '0')

  return (
    <section className="container mx-auto px-6 py-24 lg:px-10">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={transitionDefaults}
        className="mx-auto max-w-2xl text-center font-display text-4xl text-foreground md:text-5xl"
      >
        {t('landing.rearchitecture.headline')}
      </motion.h2>

      <ol className="mx-auto mt-12 max-w-4xl divide-y divide-border border-y border-border">
        {rows.map((row, index) => {
          const numeral = String(index + 1).padStart(2, '0')
          return (
            <li
              key={`${numeral}-${row.before}`}
              className="grid grid-cols-[2.5rem_1fr] items-center gap-4 py-8 md:grid-cols-[3rem_1fr_3rem_1fr] md:gap-8"
            >
              <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                {numeral}
                <span className="text-muted-foreground/40">/{total}</span>
              </span>
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={transitionDefaults}
                className="font-mono text-sm uppercase tracking-wide text-muted-foreground/80"
              >
                {row.before}
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ ...transitionDefaults, delay: 0.15 }}
                aria-hidden
                className="hidden h-8 w-8 items-center justify-center rounded-full bg-card ring-1 ring-brand-green-200 md:flex"
              >
                <ArrowRight size={14} className="text-brand-green-600" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ ...transitionDefaults, delay: 0.05 }}
                className="col-span-2 font-display text-xl leading-snug text-foreground md:col-span-1 md:text-2xl"
              >
                <span className="rounded-sm bg-brand-green-100/70 px-2 py-0.5 decoration-brand-green-400">
                  {row.after}
                </span>
              </motion.div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
