import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { AgendaSlice } from '@/components/dashboard/AgendaSlice'

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
}

/**
 * The two-column dashboard layout shared by every role: a main column
 * (children) beside an aside holding the role-scoped {@link AgendaSlice}
 * (ADR-0038). Unlike the retired `DashboardCalendar` grid, the aside now
 * shows at every width — a compact agenda travels down gracefully, so there
 * is no `xl`-only gate.
 */
export function DashboardShell({ sectionTitle, children }: DashboardShellProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="flex flex-col gap-6">
        {/* Absolutely positioned by `sr-only`, so it is not a flex item and adds no gap. */}
        <h2 className="sr-only">{sectionTitle}</h2>
        {children}
      </div>

      <motion.aside
        variants={fadeUp}
        transition={transitionDefaults}
        className="flex flex-col gap-6"
        aria-label={t('dashboard.rightPanel.agendaTitle')}
      >
        <AgendaSlice />
      </motion.aside>
    </motion.div>
  )
}
