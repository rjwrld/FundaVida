import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { fadeUp, fadeUpHidden, staggerContainer, transitionDefaults } from '@/lib/motion'
import { GithubMark } from './GithubMark'
import { HighlighterSmear } from './HighlighterSmear'
import { NumberTicker } from './NumberTicker'

/**
 * The numbered Q&A (ADR-0049, issue #384): the questions a reviewer is about to
 * ask, answered inline — no accordion, the punchlines are the content. Absorbs
 * every fact the deleted `TrustStrip`, `FeatureBento`, and `RearchitectureDelta`
 * carried: the provenance account and its before→after delta (item 03) and the
 * stat counters (item 05).
 */

/** The five items in reading order; `product` spans full width and carries the delta. */
const QA_ITEMS = [
  { key: 'backend', wide: false },
  { key: 'data', wide: false },
  { key: 'product', wide: true },
  { key: 'bilingual', wide: false },
  { key: 'break', wide: false },
] as const

/**
 * Curated snapshot figures behind item 05's counters. Static by design — a
 * landing chip is a marketing claim, not a live metric; `backends` is the one
 * that never moves. Kept a conservative floor so growth never makes them a lie.
 */
const STATS = [
  { key: 'modules', value: 12 },
  { key: 'tests', value: 1800 },
  { key: 'locales', value: 2 },
  { key: 'backends', value: 0 },
] as const

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

/** The before→after infrastructure move, re-homed from `RearchitectureDelta`. */
function InfraDelta() {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const raw = t('landing.qa.items.product.delta', { returnObjects: true })
  const rows = isDeltaRowArray(raw) ? raw : []

  return (
    <motion.ol
      variants={reduce ? undefined : staggerContainer}
      initial={reduce ? false : 'hidden'}
      whileInView={reduce ? undefined : 'visible'}
      viewport={{ once: true, amount: 0.3 }}
      className="mt-6 divide-y divide-border border-y border-border"
    >
      {rows.map((row) => (
        <motion.li
          key={row.before}
          variants={reduce ? undefined : fadeUp}
          transition={transitionDefaults}
          className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-3 md:gap-5"
        >
          <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground line-through decoration-flame-red-400/70">
            {row.before}
          </span>
          <ArrowRight aria-hidden size={14} className="shrink-0 text-brand-green-600" />
          <span className="text-sm font-semibold leading-snug text-foreground">
            <span className="rounded-xs bg-brand-green-100/70 px-1.5 py-0.5">{row.after}</span>
          </span>
        </motion.li>
      ))}
    </motion.ol>
  )
}

/** Item 05's counter chips — the numbers `TrustStrip` used to carry. */
function StatChips() {
  const { t } = useTranslation()
  return (
    <dl className="mt-6 grid grid-cols-2 gap-4">
      {STATS.map((stat) => (
        <div key={stat.key} className="flex flex-col rounded-lg border bg-card px-4 py-3">
          <dt className="order-2 mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
            {t(`landing.qa.stats.${stat.key}`)}
          </dt>
          <dd className="order-1">
            <NumberTicker
              value={stat.value}
              className="font-display text-3xl font-black text-primary"
            />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function QAItem({ item, index }: { item: (typeof QA_ITEMS)[number]; index: number }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const numeral = String(index + 1).padStart(2, '0')

  return (
    <motion.article
      initial={reduce ? false : fadeUpHidden}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={transitionDefaults}
      className={item.wide ? 'md:col-span-2' : undefined}
    >
      <div className="flex items-baseline gap-3 font-mono text-[0.7rem] uppercase tracking-[0.16em]">
        <span className="text-primary">{numeral}</span>
        <span className="text-muted-foreground">{t(`landing.qa.items.${item.key}.category`)}</span>
      </div>
      <h3 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {t(`landing.qa.items.${item.key}.q`)}
      </h3>
      <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
        <Trans
          i18nKey={`landing.qa.items.${item.key}.a`}
          components={{
            code: (
              <code
                key="code"
                className="rounded-xs bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
              />
            ),
          }}
        />
      </p>
      {item.key === 'product' && <InfraDelta />}
      {item.key === 'break' && <StatChips />}
    </motion.article>
  )
}

export function QASection() {
  const { t } = useTranslation()

  return (
    <section className="border-b">
      <div className="container mx-auto px-6 py-20 lg:px-10 lg:py-28">
        <p className="inline-flex items-center gap-2 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-primary">
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          {t('landing.qa.eyebrow')}
        </p>
        <h2 className="mt-4 max-w-3xl font-display text-[clamp(2rem,4.4vw,3.4rem)] font-black uppercase leading-[1.02] tracking-[-0.02em] text-balance">
          <Trans
            i18nKey="landing.qa.heading"
            components={{ smear: <HighlighterSmear key="smear" /> }}
          />
        </h2>

        <div className="mt-14 grid gap-x-12 gap-y-14 md:grid-cols-2">
          {QA_ITEMS.map((item, index) => (
            <QAItem key={item.key} item={item} index={index} />
          ))}
        </div>

        <a
          href="https://github.com/rjwrld/FundaVida"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-14 inline-flex items-center gap-2 font-mono text-sm font-medium uppercase tracking-[0.12em] text-foreground transition-colors hover:text-primary"
        >
          <GithubMark size={15} />
          {t('landing.qa.readSource')}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
    </section>
  )
}
