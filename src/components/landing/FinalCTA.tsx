import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useStore } from '@/data/store'
import { fadeUp, transitionDefaults } from '@/lib/motion'

export function FinalCTA() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setRole = useStore((s) => s.setRole)

  const enterAsAdmin = () => {
    setRole('admin')
    navigate('/app')
  }
  return (
    <section className="container mx-auto px-6 py-24 lg:px-10">
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        transition={transitionDefaults}
        className="relative overflow-hidden rounded-2xl bg-card p-12 text-center shadow-card ring-1 ring-brand-green-200/60 md:p-16 lg:p-20"
      >
        <div className="relative">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.25em] text-brand-green-700">
            ↳ try it
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl tracking-tight text-foreground md:text-6xl">
            {t('landing.finalCta.headline')}
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
            {t('landing.finalCta.subline')}
          </p>
          <Button size="lg" onClick={enterAsAdmin} className="mt-10 gap-2 shadow-glow-primary">
            {t('landing.finalCta.cta')}
            <ArrowRight size={16} />
          </Button>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-muted-foreground/80">
            {t('landing.hero.noSignup')}
          </p>
        </div>
      </motion.div>
    </section>
  )
}
