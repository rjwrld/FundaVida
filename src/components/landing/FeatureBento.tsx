import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { FlameCertificate } from '@/components/icons/flame'
import { fadeUp, staggerContainer, transitionDefaults } from '@/lib/motion'
import { BentoCell, BentoGrid } from './BentoGrid'

export function FeatureBento() {
  const { t } = useTranslation()
  return (
    <section className="container mx-auto px-6 py-24 lg:px-10">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={transitionDefaults}
        className="mx-auto max-w-2xl text-center font-display text-4xl text-foreground md:text-5xl"
      >
        {t('landing.featureBento.heading')}
      </motion.h2>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-12"
      >
        <BentoGrid className="auto-rows-[20rem]">
          <motion.div variants={fadeUp} transition={transitionDefaults} className="contents">
            <BentoCell span={2} className="flex flex-col p-0">
              <div className="flex flex-col gap-2 p-8 pb-4">
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-brand-green-700">
                  01 / crud
                </span>
                <h3 className="font-display text-2xl text-foreground">
                  {t('landing.featureBento.crud.title')}
                </h3>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  {t('landing.featureBento.crud.caption')}
                </p>
              </div>
              <div className="relative mt-auto flex-1 overflow-hidden">
                <img
                  src="/screenshots/students.en.png"
                  alt=""
                  aria-hidden
                  className="absolute inset-x-8 top-4 rounded-t-lg ring-1 ring-border/80 transition-transform duration-500 group-hover:translate-y-[-4px]"
                  loading="lazy"
                  decoding="async"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent"
                  aria-hidden
                />
              </div>
            </BentoCell>
          </motion.div>

          <motion.div variants={fadeUp} transition={transitionDefaults} className="contents">
            <BentoCell className="bg-gradient-to-br from-flame-yellow-50 via-card to-card ring-1 ring-flame-yellow-200/60">
              <FlameCertificate
                size={180}
                className="pointer-events-none absolute -bottom-4 -right-4 text-flame-yellow-200/70 transition-transform duration-500 group-hover:scale-105"
              />
              <div className="relative flex h-full flex-col">
                <span className="inline-flex w-fit items-center rounded-sm bg-flame-yellow-100 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-flame-yellow-700">
                  pdf
                </span>
                <h3 className="mt-4 font-display text-2xl text-foreground">
                  {t('landing.featureBento.pdf.title')}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                  {t('landing.featureBento.pdf.caption')}
                </p>
              </div>
            </BentoCell>
          </motion.div>

          <motion.div variants={fadeUp} transition={transitionDefaults} className="contents">
            <BentoCell className="bg-gradient-to-br from-brand-blue-50 via-card to-card ring-1 ring-brand-blue-200/60">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 top-6 select-none font-display leading-[0.85] tracking-tight"
              >
                <div className="text-[7rem] text-brand-blue-700/90">EN</div>
                <div className="-mt-4 text-[7rem] text-brand-blue-300/70">ES</div>
              </div>
              <div className="relative flex h-full flex-col">
                <span className="inline-flex w-fit items-center rounded-sm bg-brand-blue-100 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-widest text-brand-blue-700">
                  i18n
                </span>
                <h3 className="mt-4 max-w-[12ch] font-display text-2xl text-foreground">
                  {t('landing.featureBento.bilingual.title')}
                </h3>
                <p className="mt-2 max-w-[18ch] text-sm leading-relaxed text-muted-foreground">
                  {t('landing.featureBento.bilingual.caption')}
                </p>
              </div>
            </BentoCell>
          </motion.div>

          <motion.div variants={fadeUp} transition={transitionDefaults} className="contents">
            <BentoCell span={2} className="grid grid-cols-1 gap-6 md:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col">
                <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-brand-green-700">
                  04 / determinism
                </span>
                <h3 className="mt-2 font-display text-2xl text-foreground">
                  {t('landing.featureBento.deterministic.title')}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                  {t('landing.featureBento.deterministic.caption')}
                </p>
              </div>
              <div className="relative overflow-hidden rounded-lg bg-neutral-950 ring-1 ring-neutral-800 shadow-elevated">
                <div className="flex items-center gap-1.5 border-b border-neutral-800 px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-flame-red-500/80" aria-hidden />
                  <span className="h-2.5 w-2.5 rounded-full bg-flame-yellow-400/80" aria-hidden />
                  <span className="h-2.5 w-2.5 rounded-full bg-brand-green-400/80" aria-hidden />
                  <span className="ml-2 font-mono text-[0.65rem] uppercase tracking-widest text-neutral-500">
                    seed.ts
                  </span>
                </div>
                <pre className="overflow-x-auto px-5 py-4 font-mono text-[0.78rem] leading-relaxed text-neutral-200">
                  <code>
                    <span className="text-fuchsia-400">import</span>
                    <span className="text-neutral-300"> {'{ '}</span>
                    <span className="text-sky-300">faker</span>
                    <span className="text-neutral-300">{' }'} </span>
                    <span className="text-fuchsia-400">from</span>
                    <span className="text-amber-300"> {"'@faker-js/faker'"}</span>
                    {'\n\n'}
                    <span className="text-sky-300">faker</span>
                    <span className="text-neutral-300">.</span>
                    <span className="text-emerald-300">seed</span>
                    <span className="text-neutral-300">(</span>
                    <span className="text-orange-300">42</span>
                    <span className="text-neutral-300">)</span>
                    {'\n'}
                    <span className="text-neutral-500">
                      {'// every visitor sees the same 80 students'}
                    </span>
                  </code>
                </pre>
              </div>
            </BentoCell>
          </motion.div>
        </BentoGrid>
      </motion.div>
    </section>
  )
}
