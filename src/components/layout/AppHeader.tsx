import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RoleSwitcher } from '@/components/demo/RoleSwitcher'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'

export function AppHeader() {
  const { t } = useTranslation()
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/app" className="font-semibold tracking-tight">
          {t('header.brand')}
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label={t('header.primaryAriaLabel')} className="text-sm text-muted-foreground">
            <span>{t('header.demoLabel')}</span>
          </nav>
          <LanguageToggle variant="header" />
          <ThemeToggle />
          <RoleSwitcher />
        </div>
      </div>
    </header>
  )
}
