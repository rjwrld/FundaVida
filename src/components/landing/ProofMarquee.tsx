import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '@/data/store'
import { fadeUpHidden, transitionDefaults } from '@/lib/motion'
import { Marquee } from './Marquee'
import { useRoleEntry } from './useRoleEntry'

/**
 * The proof marquee (ADR-0049, issue #386): a scrolling row of browser-framed
 * app screenshots between the hero and the Q&A — the "here's what's actually
 * inside" beat. Consumes the one screenshot pipeline (`scripts/screenshots.ts`,
 * #314): the same PNGs the README ships, resolved per active locale where an
 * es variant exists. Pauses on hover; under reduced motion it drops the scroll
 * animation for a static, touch-scrollable row.
 */

interface Shot {
  /** i18n label key suffix (`landing.marquee.shots.${key}`). */
  key: string
  /** Base filename under `public/screenshots/` (locale + `.png` appended). */
  file: string
  /** The app route shown in the frame's mono URL caption. */
  path: string
  /** Whether an `.es` variant exists; single-locale shots always resolve `.en`. */
  bilingual: boolean
}

/**
 * The curated marquee surfaces. `dashboard` reuses the README hero shot; the
 * dark `mark-session` capture carries the "both themes ship" proof (ADR-0049).
 * Order is the reading order of a first tour: land, plan, roster, outcome.
 */
const SHOTS: Shot[] = [
  { key: 'dashboard', file: 'hero', path: '/app', bilingual: false },
  { key: 'calendar', file: 'calendar', path: '/app/calendar', bilingual: true },
  { key: 'students', file: 'students', path: '/app/students', bilingual: true },
  { key: 'certificate', file: 'certificate', path: '/app/certificates', bilingual: true },
  // The captures are a course *detail* and the mark-session *form*; the captions
  // mirror their real (truncated) routes rather than the list routes above them.
  { key: 'course', file: 'course', path: '/app/courses/…', bilingual: true },
  { key: 'markSession', file: 'mark-session', path: '/app/courses/…/mark', bilingual: false },
]

function BrowserFrame({ shot, locale }: { shot: Shot; locale: string }) {
  const { t } = useTranslation()
  const label = t(`landing.marquee.shots.${shot.key}`)
  const variant = shot.bilingual ? locale : 'en'
  const src = `/screenshots/${shot.file}.${variant}.png`

  return (
    <figure className="w-[18rem] shrink-0 sm:w-[22rem]">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
          <span aria-hidden className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-flame-red-400/70" />
            <span className="size-2.5 rounded-full bg-flame-yellow-400/70" />
            <span className="size-2.5 rounded-full bg-brand-green-400/70" />
          </span>
          <span className="truncate rounded-full bg-background px-2 py-0.5 font-mono text-[0.62rem] text-muted-foreground">
            fundavida.app{shot.path}
          </span>
        </div>
        <img
          src={src}
          alt={t('landing.marquee.shotAlt', { label })}
          loading="lazy"
          width={1440}
          height={900}
          className="h-44 w-full object-cover object-top sm:h-52"
        />
      </div>
      <figcaption className="mt-2 px-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </figcaption>
    </figure>
  )
}

export function ProofMarquee() {
  const reduce = useReducedMotion()
  const locale = useStore((s) => s.locale)
  const { t, enterAsAdmin } = useRoleEntry()

  const frames = SHOTS.map((shot) => <BrowserFrame key={shot.key} shot={shot} locale={locale} />)

  return (
    <section className="grid-paper overflow-hidden border-b py-14 lg:py-20">
      <motion.div
        initial={reduce ? false : fadeUpHidden}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={transitionDefaults}
        className="container mx-auto flex flex-wrap items-baseline justify-between gap-3 px-6 lg:px-10"
      >
        <p className="inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-primary">
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          {t('landing.marquee.head')}
        </p>
        <button
          type="button"
          onClick={enterAsAdmin}
          className="group inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.12em] text-foreground transition-colors hover:text-primary"
        >
          {t('landing.marquee.openApp')}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </motion.div>

      {reduce ? (
        <div className="mt-10 flex gap-5 overflow-x-auto px-6 pb-2 lg:px-10">{frames}</div>
      ) : (
        <motion.div
          initial={fadeUpHidden}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={transitionDefaults}
          className="mt-10 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]"
        >
          <Marquee className="[--duration:48s] [--gap:1.25rem] py-1">{frames}</Marquee>
        </motion.div>
      )}
    </section>
  )
}
