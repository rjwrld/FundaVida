import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CalendarDays } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { DashboardCalendar } from '@/components/shared/DashboardCalendar'
import { UpcomingList, type UpcomingItem } from '@/components/shared/UpcomingList'
import type { Course } from '@/types'

// Stagger 0.05s — alive but not busy, matching the per-role dashboards.
const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

export interface DashboardShellProps {
  /** Main column content (role-specific stats and panels). */
  children: ReactNode
  /** Courses already scoped to the viewer; drive the sidebar calendar (ADR-0013). */
  courses: Course[]
  /** Optional "On your radar" items; when omitted the aside shows the calendar only. */
  upcoming?: UpcomingItem[]
}

/**
 * The two-column dashboard layout shared by every role that has a calendar: a main
 * column (children) beside an aside holding the role-scoped DashboardCalendar and,
 * optionally, the "On your radar" panel. The aside collapses below xl. The TCU
 * dashboard opts out of this shell by design: it centres a single assigned-Course
 * card and the log-hours action (ADR-0036), not a full calendar aside.
 */
export function DashboardShell({ children, courses, upcoming }: DashboardShellProps) {
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
        className="hidden flex-col gap-6 xl:flex"
        aria-label={t('dashboard.rightPanel.calendarTitle')}
      >
        <DashboardCalendar courses={courses} />
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
