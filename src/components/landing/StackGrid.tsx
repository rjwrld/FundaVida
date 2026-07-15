import { motion, useReducedMotion } from 'framer-motion'
import { Trans, useTranslation } from 'react-i18next'
import { fadeIn, staggerContainer } from '@/lib/motion'
import { HighlighterSmear } from './HighlighterSmear'

/**
 * The stack grid (ADR-0049, issue #385): a bordered cell grid of the actual
 * dependencies, the message embedded in a center 2×2 cell — "No backend. It's
 * all here." Replaces the deleted `TechStackMarquee`; the scrolling proof
 * marquee (#386) is a different surface.
 *
 * Names are proper nouns and kinds are a fixed technical taxonomy, so both stay
 * untranslated (the marquee precedent, and the ADR-0017 proper-noun rule); only
 * the center prose is bilingual. The center cell is placed in the middle of the
 * source order so mobile (3 columns, full-width center) reads deps → message →
 * deps; the split lands on a clean 3-column row so the mobile center never
 * strands a mid-grid gap. On desktop `md:col-start-3/row-start-2` reserves its
 * 2×2 area and `grid-flow-row-dense` backfills the 20 dep cells around it
 * (6×4 − 2×2 = 20).
 */

interface Dep {
  name: string
  kind: string
}

const DEPS: Dep[] = [
  { name: 'React', kind: 'UI' },
  { name: 'TypeScript', kind: 'Language' },
  { name: 'Vite', kind: 'Build' },
  { name: 'Tailwind', kind: 'Styles' },
  { name: 'Sonner', kind: 'Toasts' },
  { name: 'Radix UI', kind: 'Primitives' },
  { name: 'Zustand', kind: 'State' },
  { name: 'TanStack Query', kind: 'Server cache' },
  { name: 'TanStack Table', kind: 'Tables' },
  { name: 'React Hook Form', kind: 'Forms' },
  { name: 'Zod', kind: 'Schemas' },
  { name: 'React Router', kind: 'Routing' },
  { name: 'react-i18next', kind: 'i18n' },
  { name: 'Framer Motion', kind: 'Motion' },
  { name: 'React PDF', kind: 'Certificates' },
  { name: 'Recharts', kind: 'Charts' },
  { name: 'date-fns', kind: 'Dates' },
  { name: 'Lucide', kind: 'Icons' },
  { name: 'Vitest', kind: 'Unit tests' },
  { name: 'Playwright', kind: 'E2E' },
]

/**
 * The message splits the deck on a 3-column boundary (9 = 3 full mobile rows
 * before it), so the mobile center opens a clean new row instead of stranding
 * a mid-grid gap. Desktop ignores this — the center is placed explicitly.
 */
const CENTER_INDEX = 9

function DepCell({ dep }: { dep: Dep }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      variants={reduce ? undefined : fadeIn}
      className="group relative flex min-h-28 flex-col justify-end overflow-hidden bg-card p-3 transition-colors hover:bg-brand-green-50/60"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-1 -top-3 select-none font-display text-6xl font-black leading-none text-muted-foreground/[0.07] transition-colors group-hover:text-primary/15"
      >
        {dep.name[0]}
      </span>
      <span className="relative font-mono text-sm font-medium text-foreground">{dep.name}</span>
      <span className="relative mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
        {dep.kind}
      </span>
    </motion.div>
  )
}

function CenterCell() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <motion.div
      variants={reduce ? undefined : fadeIn}
      className="col-span-3 flex flex-col items-center justify-center bg-background p-6 text-center md:col-span-2 md:col-start-3 md:row-span-2 md:row-start-2 md:p-8"
    >
      <p className="inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.16em] text-primary">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        {t('landing.stack.eyebrow')}
      </p>
      <h2 className="mt-3 font-display text-2xl font-black uppercase leading-[1.02] tracking-[-0.02em] text-balance md:text-3xl">
        <Trans
          i18nKey="landing.stack.headline"
          components={{ smear: <HighlighterSmear key="smear" /> }}
        />
      </h2>
      <p className="mt-4 font-mono text-[0.68rem] uppercase tracking-[0.12em] text-muted-foreground">
        {t('landing.stack.more')}
      </p>
    </motion.div>
  )
}

export function StackGrid() {
  const reduce = useReducedMotion()
  const before = DEPS.slice(0, CENTER_INDEX)
  const after = DEPS.slice(CENTER_INDEX)

  return (
    <section className="border-b">
      <div className="container mx-auto px-6 py-20 lg:px-10 lg:py-28">
        <motion.div
          variants={reduce ? undefined : staggerContainer}
          initial={reduce ? false : 'hidden'}
          whileInView={reduce ? undefined : 'visible'}
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-flow-row-dense grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-6"
        >
          {before.map((dep) => (
            <DepCell key={dep.name} dep={dep} />
          ))}
          <CenterCell />
          {after.map((dep) => (
            <DepCell key={dep.name} dep={dep} />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
