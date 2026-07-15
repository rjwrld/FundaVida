import { motion, useReducedMotion } from 'framer-motion'
import { Trans, useTranslation } from 'react-i18next'
import { BarChart3, Bell, FileText, type LucideIcon } from 'lucide-react'
import { fadeIn, staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { HighlighterSmear } from './HighlighterSmear'
import { STACK_LOGOS } from './stackLogos'
import { TECH_ICONS } from './techIcons'

/**
 * The stack grid (ADR-0049, issue #385): a bordered cell grid of the actual
 * dependencies, the message embedded in a center 2×2 cell — "No backend. It's
 * all here." Replaces the deleted `TechStackMarquee`; the scrolling proof
 * marquee (#386) is a different surface.
 *
 * Each cell wears its tool's official logo, grayscale at rest so the grid keeps
 * the landing's restraint, igniting to full brand colour with a springy lift on
 * hover. Logos come from three tiers: extracted full-colour artwork
 * (`stackLogos.ts`, theme-variant aware), single-path marks tinted with a brand
 * hue (`techIcons.ts`), and — for the three tools with no distributable mark
 * anywhere (Sonner, Recharts, React PDF) — a Lucide glyph that ignites to the
 * site's own green. Names are proper nouns and kinds are a fixed technical
 * taxonomy, so both stay untranslated (the marquee precedent, and the ADR-0017
 * proper-noun rule); only the center prose is bilingual. The center cell is
 * placed in the middle of the source order so mobile (3 columns, full-width
 * center) reads deps → message → deps; the split lands on a clean 3-column row
 * so the mobile center never strands a mid-grid gap. On desktop
 * `md:col-start-3/row-start-2` reserves its 2×2 area and `grid-flow-row-dense`
 * backfills the 20 dep cells around it (6×4 − 2×2 = 20).
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

/** Kind glyphs for the three tools with no distributable brand mark. */
const FALLBACK_ICONS: Record<string, LucideIcon> = {
  Sonner: Bell,
  'React PDF': FileText,
  Recharts: BarChart3,
}

/**
 * The message splits the deck on a 3-column boundary (9 = 3 full mobile rows
 * before it), so the mobile center opens a clean new row instead of stranding
 * a mid-grid gap. Desktop ignores this — the center is placed explicitly.
 */
const CENTER_INDEX = 9

function DepIcon({ dep, reduce }: { dep: Dep; reduce: boolean }) {
  // Grayscale + dimmed at rest; the real colours ignite on hover. The springy
  // overshoot curve gives the lift its pop — under reduced motion the icon only
  // recolours in place.
  const ignite = cn(
    'size-7 grayscale opacity-60 transition-all duration-300',
    'group-hover:grayscale-0 group-hover:opacity-100',
    !reduce &&
      'ease-[cubic-bezier(.34,1.56,.64,1)] group-hover:-translate-y-1 group-hover:scale-[1.18] group-hover:-rotate-3'
  )

  const logo = STACK_LOGOS[dep.name]
  if (logo) {
    // Theme-variant artwork: both <img>s ship, CSS shows the right one, and the
    // single-variant logos reuse the same URL for both (one request either way).
    return (
      <span aria-hidden className="relative block size-7">
        <img src={logo.light} alt="" draggable={false} className={cn(ignite, 'dark:hidden')} />
        <img src={logo.dark} alt="" draggable={false} className={cn(ignite, 'hidden dark:block')} />
      </span>
    )
  }

  const mark = TECH_ICONS[dep.name]
  if (mark) {
    return (
      <svg aria-hidden viewBox="0 0 24 24" fill={mark.hue} className={ignite}>
        <path d={mark.path} />
      </svg>
    )
  }

  // The grayscale filter mutes currentColor too, so the glyphs sit gray at rest
  // and ignite to the site green with the same mechanism as the brand marks.
  const Fallback = FALLBACK_ICONS[dep.name]
  if (!Fallback) return null
  return <Fallback aria-hidden strokeWidth={1.75} className={cn(ignite, 'text-primary')} />
}

function DepCell({ dep }: { dep: Dep }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      variants={reduce ? undefined : fadeIn}
      className="group relative flex min-h-28 flex-col items-center justify-center gap-2.5 overflow-hidden bg-card p-3 text-center transition-colors duration-300 hover:bg-brand-green-50/60 dark:bg-background dark:hover:bg-brand-green-400/[0.08]"
    >
      {/* soft glow blooming behind the icon while it ignites */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-2 size-24 -translate-x-1/2 rounded-full bg-primary/0 blur-2xl transition-colors duration-300 group-hover:bg-primary/15"
      />
      <DepIcon dep={dep} reduce={Boolean(reduce)} />
      <div className="relative">
        <span className="block font-mono text-sm font-medium text-foreground">{dep.name}</span>
        <span className="mt-1 block font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
          {dep.kind}
        </span>
      </div>
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
