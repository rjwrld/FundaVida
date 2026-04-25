import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { FlameHope } from '@/components/icons/flame'
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
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue-50/60 via-card to-brand-green-50/80 p-12 text-center shadow-card ring-1 ring-brand-green-200/60 md:p-16 lg:p-20"
      >
        <FlameHope
          size={240}
          className="pointer-events-none absolute -right-12 -top-12 text-brand-green-100/80"
        />
        <FlameHope
          size={120}
          className="pointer-events-none absolute -bottom-8 -left-8 -rotate-12 text-brand-green-100/50"
        />
        <div className="relative">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.25em] text-brand-green-700">
            ↳ try it
          </p>
          <h2 className="mx-auto mt-4 max-w-3xl bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text font-display text-4xl tracking-tight text-transparent md:text-6xl">
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
