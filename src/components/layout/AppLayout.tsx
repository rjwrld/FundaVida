import { useEffect, useRef } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { AppFooter } from './AppFooter'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { CommandPalette } from '@/components/shared/CommandPalette'
import { CommandPaletteProvider } from '@/components/shared/CommandPaletteProvider'
import { fadeUp, transitionDefaults } from '@/lib/motion'

function AnimatedOutlet() {
  const { pathname } = useLocation()
  const outlet = useOutlet()
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
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}

export function AppLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const previousPathname = useRef(pathname)

  // On client-side navigation, move focus to the main region so keyboard and
  // screen-reader users land on the new page's content (which starts at its
  // <h1>) instead of being stranded where the previous route left focus — the
  // route swap is otherwise silent. Compare against the previous path (rather
  // than a "first render" flag) so the initial load keeps its natural focus
  // (e.g. the skip link) even when StrictMode double-invokes this effect.
  useEffect(() => {
    if (previousPathname.current !== pathname) {
      mainRef.current?.focus()
    }
    previousPathname.current = pathname
  }, [pathname])

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
          <main
            id="main-content"
            ref={mainRef}
            tabIndex={-1}
            className="min-w-0 flex-1 p-6 focus:outline-none"
          >
            <AnimatedOutlet />
          </main>
        </div>
        <AppFooter />
        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  )
}
