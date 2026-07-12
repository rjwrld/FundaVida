import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { DemoBadge } from '@/components/demo/DemoBadge'
import { BrandLockup } from '@/components/brand/BrandLockup'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useCommandPaletteContext } from '@/hooks/useCommandPaletteContext'

export function AppHeader() {
  const { t } = useTranslation()
  const { setOpen } = useCommandPaletteContext()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/60 bg-background/85 px-4 backdrop-blur-md md:gap-4 md:px-6">
      <div className="flex flex-1 items-center gap-3">
        {/*
          The brand cluster is shrink-0 so it can never be crushed to zero
          width and painted over by the right-hand controls (#271); under
          extreme pressure the row overflows right instead. Breadcrumbs keep
          their own min-w-0 and truncate.

          One trigger, two jobs: below `md` it opens the sidebar's drawer (the
          hamburger MobileNav used to own), from `md` up it collapses the rail —
          the same thing ⌘/Ctrl+B does. The lockup is the sidebar's above `md`,
          so the header only carries it while the sidebar is a sheet.
        */}
        <div className="flex shrink-0 items-center gap-3">
          <SidebarTrigger aria-label={t('sidebar.toggle')} />
          <BrandLockup className="md:hidden" />
        </div>
        {/* `data-[orientation=vertical]:h-5` and not `h-5`: the primitive's own
            `data-[orientation=vertical]:h-full` would otherwise out-specify a
            bare height and stretch the rule to the full header. */}
        <Separator
          orientation="vertical"
          className="hidden bg-border/60 data-[orientation=vertical]:h-5 sm:block"
        />
        <Breadcrumbs />
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={t('common.commandPalette.placeholder')}
        className="group relative hidden h-9 w-[220px] justify-start gap-2 rounded-md border border-border/60 bg-muted/40 px-3 text-sm font-normal text-muted-foreground shadow-none hover:bg-muted hover:text-foreground md:inline-flex md:w-[260px]"
      >
        <Search className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        <span className="flex-1 text-left">{t('common.search')}</span>
        <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-0.5 rounded-sm border border-border/60 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-[11px] leading-none">⌘</span>K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t('common.search')}
        onClick={() => setOpen(true)}
        className="shrink-0 md:hidden"
      >
        <Search className="size-4" />
      </Button>
      {/* The role switch is no longer here: it is the sidebar's user footer, where the
          block puts the account menu (ADR-0047 phase 4a). */}
      <div className="flex shrink-0 items-center gap-1.5">
        <DemoBadge />
        <ThemeToggle />
        <LanguageToggle variant="header" />
      </div>
    </header>
  )
}
