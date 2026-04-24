import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { CommandPaletteProvider } from '@/components/shared/CommandPaletteProvider'
import { fadeUp, transitionDefaults } from '@/lib/motion'

function AnimatedOutlet() {
  const { pathname } = useLocation()
  // Collapse dynamic id segments so detail→detail navigation (e.g. /app/students/1 → /app/students/2)
  // doesn't remount the subtree. Route params in this app are numeric.
  const routeKey = pathname.replace(/\/\d+(?=\/|$)/g, '/:id')
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={routeKey}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        exit="hidden"
        transition={transitionDefaults}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  )
}

export function AppLayout() {
  const { t } = useTranslation()
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow focus:ring-2 focus:ring-ring"
        >
          {t('common.a11y.skipToMain')}
        </a>
        <DemoBanner />
        <AppHeader />
        <div className="flex flex-1">
          <AppSidebar />
          <main id="main-content" className="flex-1 p-6">
            <AnimatedOutlet />
          </main>
        </div>
        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  )
}
