import { motion } from 'framer-motion'
import { ArrowRight, Github } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AuroraBackground } from './AuroraBackground'
import { fadeUp, staggerContainer, transitionDefaults } from '@/lib/motion'

export function Hero() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <AuroraBackground className="min-h-[90vh]">
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="container mx-auto grid gap-12 px-6 py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:py-32"
      >
        <div className="flex flex-col justify-center">
          <motion.p
            variants={fadeUp}
            transition={transitionDefaults}
            className="mb-5 flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-primary"
          >
            <span aria-hidden className="h-px w-8 bg-primary/60" />
            {t('landing.hero.eyebrow')}
          </motion.p>
          <motion.h1
            variants={fadeUp}
            transition={transitionDefaults}
            className="font-display text-6xl font-normal leading-[1.05] tracking-[-0.02em] text-foreground md:text-7xl"
          >
            {t('landing.hero.headline')}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={transitionDefaults}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            {t('landing.hero.subhead')}
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={transitionDefaults}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Button
              size="lg"
              onClick={() => navigate('/app')}
              className="group gap-2 shadow-glow-primary"
            >
              {t('landing.hero.primaryCta')}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/rjwrld/FundaVida"
                target="_blank"
                rel="noopener noreferrer"
                className="gap-2"
              >
                <Github size={16} />
                {t('landing.hero.secondaryCta')}
              </a>
            </Button>
          </motion.div>
          <motion.p
            variants={fadeUp}
            transition={transitionDefaults}
            className="mt-4 text-xs text-muted-foreground"
          >
            {t('landing.hero.noSignup')}
          </motion.p>
        </div>
        <motion.div
          variants={fadeUp}
          transition={{ ...transitionDefaults, delay: 0.3 }}
          className="flex items-center justify-center"
        >
          <img
            src="/illustrations/landing-hero.svg"
            alt={t('landing.hero.illustrationAlt')}
            className="float animate-float w-full max-w-sm drop-shadow-xl lg:max-w-lg"
            width={600}
            height={600}
            loading="eager"
            decoding="async"
          />
        </motion.div>
      </motion.div>
    </AuroraBackground>
  )
}
