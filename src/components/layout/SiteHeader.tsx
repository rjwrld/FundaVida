import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { DemoBadge } from '@/components/demo/DemoBadge'
import { BrandLockup } from '@/components/brand/BrandLockup'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { useCommandPaletteContext } from '@/hooks/useCommandPaletteContext'

/**
 * The shell's header, on the registry block's header slot (ADR-0047 phase 4b):
 * trigger + separator + breadcrumbs on the left, the ⌘K trigger and the toggles
 * behind `ml-auto`. The height collapses with the rail via the block's
 * `group/sidebar-wrapper` selector. The old AppHeader's custom chrome — sticky,
 * backdrop blur, translucent background — retires with it: stock block headers
 * scroll with the page.
 */
export function SiteHeader() {
  const { t } = useTranslation()
  const { setOpen } = useCommandPaletteContext()

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex w-full min-w-0 items-center gap-2 px-4 lg:px-6">
        {/*
          The brand cluster is shrink-0 so it can never be crushed to zero
          width and painted over by the right-hand controls (#271); under
          extreme pressure the row overflows right instead. Breadcrumbs keep
          their own min-w-0 and truncate.

          One trigger, two jobs: below `md` it opens the sidebar's drawer, from
          `md` up it collapses the rail — the same thing ⌘/Ctrl+B does. The
          lockup is the sidebar's above `md`, so the header only carries it
          while the sidebar is a sheet.
        */}
        <div className="flex shrink-0 items-center gap-2">
          <SidebarTrigger className="-ml-1" aria-label={t('sidebar.toggle')} />
          <BrandLockup className="md:hidden" />
        </div>
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <Breadcrumbs />
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* Both buttons share the palette-input's accessible name; the compact
              one stands in below `md`, where the wide trigger has no room. */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(true)}
            aria-label={t('common.commandPalette.placeholder')}
            className="hidden w-56 justify-start font-normal text-muted-foreground shadow-none md:inline-flex lg:w-64"
          >
            <Search />
            <span className="flex-1 truncate text-left">{t('common.search')}</span>
            {/* Not the stock bg-muted fill: muted-foreground on muted is 4.34:1 at
                this 12px size and fails the axe AA gate; on the button's own
                background it clears 4.5:1, so the kbd keeps a border instead. */}
            <Kbd className="border bg-background">⌘K</Kbd>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t('common.search')}
            onClick={() => setOpen(true)}
            className="md:hidden"
          >
            <Search />
          </Button>
          {/* The role switch is no longer here: it is the sidebar's user footer,
              where the block puts the account menu (ADR-0047 phase 4a). */}
          <DemoBadge />
          <ThemeToggle />
          <LanguageToggle variant="header" />
        </div>
      </div>
    </header>
  )
}
