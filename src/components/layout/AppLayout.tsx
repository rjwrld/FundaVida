import { Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { DemoBanner } from '@/components/demo/DemoBanner'

export function AppLayout() {
  const { t } = useTranslation()
  return (
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
