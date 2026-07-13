import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Monitor, Moon, Search, Sun } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Kbd } from '@/components/ui/kbd'
import { navItemsForRole } from '@/constants/nav'
import { useStore } from '@/data/store'
import { useTheme, type Theme } from '@/hooks/useTheme'
import { useCommandPaletteContext } from '@/hooks/useCommandPaletteContext'

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const { open, setOpen } = useCommandPaletteContext()
  const { setTheme } = useTheme()

  // The palette's navigation group derives from the same role→matrix filter the
  // sidebar and mobile drawer use (ADR-0035), so it can never offer a destination
  // RoleGate would bounce.
  const navItems = role ? navItemsForRole(role) : []

  const runNav = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  const runTheme = (next: Theme) => {
    setOpen(false)
    setTheme(next)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder={t('common.commandPalette.placeholder')} />
      <CommandList>
        <CommandEmpty>
          <Search className="size-5 text-muted-foreground" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">{t('common.commandPalette.empty')}</p>
        </CommandEmpty>

        <CommandGroup heading={t('common.commandPalette.navigation')}>
          {navItems.map((item) => {
            const Icon = item.icon
            const label = t(item.labelKey)
            return (
              <CommandItem
                key={item.to}
                value={[label, ...(item.keywords ?? [])].join(' ')}
                onSelect={() => runNav(item.to)}
              >
                <Icon />
                {label}
              </CommandItem>
            )
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading={t('common.commandPalette.theme')}>
          <CommandItem
            value={`${t('common.theme.light')} theme`}
            onSelect={() => runTheme('light')}
          >
            <Sun />
            {t('common.theme.light')}
          </CommandItem>
          <CommandItem value={`${t('common.theme.dark')} theme`} onSelect={() => runTheme('dark')}>
            <Moon />
            {t('common.theme.dark')}
          </CommandItem>
          <CommandItem
            value={`${t('common.theme.system')} theme`}
            onSelect={() => runTheme('system')}
          >
            <Monitor />
            {t('common.theme.system')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
      <CommandFooter>
        <div className="flex items-center gap-3">
          {/* Same bordered treatment as the header's ⌘K hint (SiteHeader): the
              stock bg-muted fill fails the axe AA gate at this text size. */}
          <span className="flex items-center gap-1">
            <Kbd className="border bg-background">↵</Kbd>
            {t('common.commandPalette.hints.select')}
          </span>
          <span className="flex items-center gap-1">
            <Kbd className="border bg-background">Esc</Kbd>
            {t('common.commandPalette.hints.close')}
          </span>
        </div>
        <span className="font-mono">fundavida</span>
      </CommandFooter>
    </CommandDialog>
  )
}
