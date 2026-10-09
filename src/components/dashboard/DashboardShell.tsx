import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { cn } from '@/lib/utils'

// Stagger 0.05s — alive but not busy, matching the per-role dashboards.
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

export interface DashboardShellProps {
  /**
   * Names the main column. Rendered as an `sr-only` `<h2>` above the children,
   * bridging the `PageHeader` `<h1>` to the cards' `<h3>`s — without it every
   * role dashboard skips a heading level (issue #278). Required, so a new role
   * cannot reintroduce the skip.
   */
  sectionTitle: string
  /** Main column content (role-specific stats and panels). */
  children: ReactNode
  /**
   * The role's side column, opt-in (ADR-0050): teacher and student pass their
   * agenda slice; admin and TCU pass nothing and the main column takes the
   * full width.
   */
  aside?: ReactNode
}

/**
 * The dashboard layout shared by every role: a main column (children) and, for
 * the roles that opt in, an aside beside it (ADR-0050 amends ADR-0038's
 * always-on aside). The aside shows at every width — below `xl` it stacks
 * under the main column — so there is no `xl`-only gate.
 */
export function DashboardShell({ sectionTitle, children, aside }: DashboardShellProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className={cn(
        'grid grid-cols-1 gap-6',
        aside !== undefined && 'xl:grid-cols-[minmax(0,1fr)_300px]'
      )}
    >
      <div className="flex flex-col gap-6">
        {/* Absolutely positioned by `sr-only`, so it is not a flex item and adds no gap. */}
        <h2 className="sr-only">{sectionTitle}</h2>
        {children}
      </div>

      {aside !== undefined && (
        <motion.aside
          variants={fadeUp}
          transition={transitionDefaults}
          // Top-aligned: a stretched grid item would pull the aside's card down to
          // the main column's full height.
          className="flex flex-col gap-6 xl:self-start"
          aria-label={t('dashboard.rightPanel.agendaTitle')}
        >
          {aside}
        </motion.aside>
      )}
    </motion.div>
  )
}
