import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Trans } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { fadeUp, fadeUpHidden, staggerContainer, transitionDefaults } from '@/lib/motion'
import type { Role } from '@/types'
import { HighlighterSmear } from './HighlighterSmear'
import { initials } from './initials'
import { LANDING_ROLES, useRoleEntry } from './useRoleEntry'

/**
 * The final CTA (ADR-0049, issue #385): "Pick a badge. Walk in." on the
 * grid-paper band. The persona badges are reprised small — same `setRole` +
 * `landingPathForRole` entry as the hero, via the shared `useRoleEntry` hook —
 * with the explicit "Enter as admin" fast path below them.
 */

/** A compact reprise of a hero persona badge — role label, initials, name. */
function MiniBadge({
  role,
  roleLabel,
  name,
  onEnter,
}: {
  role: Role
  roleLabel: string
  name: string
  onEnter: (role: Role) => void
}) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      onClick={() => onEnter(role)}
      variants={reduce ? undefined : fadeUp}
      transition={transitionDefaults}
      whileHover={reduce ? undefined : { y: -3 }}
      whileFocus={reduce ? undefined : { y: -3 }}
      className="group flex items-center gap-2.5 rounded-full border bg-card py-1.5 pl-1.5 pr-4 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 font-display text-xs font-extrabold text-primary"
      >
        {initials(name)}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-mono text-[0.6rem] font-medium uppercase tracking-[0.16em] text-primary">
          {roleLabel}
        </span>
        <span className="text-sm font-semibold">{name}</span>
      </span>
    </motion.button>
  )
}

export function FinalCTA() {
  const reduce = useReducedMotion()
  const { t, personaName, enterAs, enterAsAdmin } = useRoleEntry()

  return (
    <section className="grid-paper border-b">
      <div className="container mx-auto px-6 py-24 text-center lg:px-10 lg:py-28">
        <motion.div
          initial={reduce ? false : fadeUpHidden}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={transitionDefaults}
        >
          <p className="inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.16em] text-primary">
            <span aria-hidden className="size-1.5 rounded-full bg-primary" />
            {t('landing.finalCta.eyebrow')}
          </p>
          <h2 className="mx-auto mt-5 max-w-3xl font-display text-[clamp(2.2rem,5vw,4rem)] font-black uppercase leading-[0.98] tracking-[-0.03em] text-balance">
            <Trans
              i18nKey="landing.finalCta.headline"
              components={{ smear: <HighlighterSmear key="smear" /> }}
            />
          </h2>
        </motion.div>

        <motion.div
          variants={reduce ? undefined : staggerContainer}
          initial={reduce ? false : 'hidden'}
          whileInView={reduce ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {LANDING_ROLES.map((role) => (
            <MiniBadge
              key={role}
              role={role}
              roleLabel={t(`roles.${role}.label`)}
              name={personaName(role)}
              onEnter={enterAs}
            />
          ))}
        </motion.div>

        <div className="mt-10">
          <Button size="lg" onClick={enterAsAdmin} className="group gap-2">
            {t('landing.finalCta.cta')}
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Button>
          <p className="mt-5 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
            <Trans
              i18nKey="landing.hero.footnote"
              components={{ green: <span key="green" className="text-primary" /> }}
            />
          </p>
        </div>
      </div>
    </section>
  )
}
