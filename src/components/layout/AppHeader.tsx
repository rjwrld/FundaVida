import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { RoleSwitcher } from '@/components/demo/RoleSwitcher'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useCommandPaletteContext } from '@/hooks/useCommandPaletteContext'

export function AppHeader() {
  const { t } = useTranslation()
  const { setOpen } = useCommandPaletteContext()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md md:px-6">
      <Breadcrumbs />
      <div className="flex-1" />
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={t('common.commandPalette.placeholder')}
        className="group relative hidden h-9 w-[220px] justify-start gap-2 rounded-md border border-border/60 bg-muted/40 px-3 text-sm font-normal text-muted-foreground shadow-none hover:bg-muted hover:text-foreground md:inline-flex md:w-[260px]"
      >
        <Search className="size-4 shrink-0 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
        <span className="flex-1 text-left">{t('common.search')}</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-0.5 rounded border border-border/60 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-[11px] leading-none">⌘</span>K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('common.search')}
        onClick={() => setOpen(true)}
        className="md:hidden"
      >
        <Search className="size-4" />
      </Button>
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <LanguageToggle variant="header" />
        <RoleSwitcher />
      </div>
    </header>
  )
}
