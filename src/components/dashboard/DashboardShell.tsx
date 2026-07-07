import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { AgendaSlice } from '@/components/dashboard/AgendaSlice'
import { UpcomingList, type UpcomingItem } from '@/components/shared/UpcomingList'

// Stagger 0.05s — alive but not busy, matching the per-role dashboards.
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

export interface DashboardShellProps {
  /** Main column content (role-specific stats and panels). */
  children: ReactNode
  /**
   * Optional operational nudges (e.g. admin's grade-pending / tcu-logged
   * items) — a distinct concept from the agenda's derived Sessions, so it
   * renders as its own section below the agenda rather than folding in.
   */
  upcoming?: UpcomingItem[]
}

/**
 * The two-column dashboard layout shared by every role: a main column
 * (children) beside an aside holding the role-scoped {@link AgendaSlice}
 * (ADR-0038) and, optionally, operational nudges. Unlike the retired
 * `DashboardCalendar` grid, the aside now shows at every width — a compact
 * agenda travels down gracefully, so there is no `xl`-only gate.
 */
export function DashboardShell({ children, upcoming }: DashboardShellProps) {
  const { t } = useTranslation()

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="flex flex-col gap-6">{children}</div>

      <motion.aside
        variants={fadeUp}
        transition={transitionDefaults}
        className="flex flex-col gap-6"
        aria-label={t('dashboard.rightPanel.agendaTitle')}
      >
        <AgendaSlice />
        {upcoming ? (
          <section className="rounded-lg border border-border bg-card p-5">
            <header className="mb-3 flex items-center gap-2">
              <CalendarDays
                className="size-4 text-brand-green-700 dark:text-brand-green-300"
                aria-hidden="true"
              />
              <h3 className="font-display text-base text-foreground">
                {t('dashboard.rightPanel.upcomingTitle')}
              </h3>
            </header>
            <UpcomingList items={upcoming} emptyLabel={t('dashboard.rightPanel.upcomingEmpty')} />
          </section>
        ) : null}
      </motion.aside>
    </motion.div>
  )
}
