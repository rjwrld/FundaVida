import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Award,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Mail,
  Monitor,
  Moon,
  Search,
  Sun,
  Users,
} from 'lucide-react'
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
import { useTheme, type Theme } from '@/hooks/useTheme'
import { useCommandPaletteContext } from '@/hooks/useCommandPaletteContext'

interface NavAction {
  to: string
  labelKey: string
  icon: typeof LayoutDashboard
  keywords?: string[]
}

const NAV_ACTIONS: NavAction[] = [
  { to: '/app', labelKey: 'nav.dashboard', icon: LayoutDashboard, keywords: ['home'] },
  { to: '/app/students', labelKey: 'nav.students', icon: Users },
  { to: '/app/courses', labelKey: 'nav.courses', icon: BookOpen },
  { to: '/app/certificates', labelKey: 'nav.certificates', icon: Award },
  { to: '/app/reports', labelKey: 'nav.reports', icon: ClipboardList },
  { to: '/app/bulk-email', labelKey: 'nav.bulkEmail', icon: Mail },
]

export function CommandPalette() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { open, setOpen } = useCommandPaletteContext()
  const { setTheme } = useTheme()

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
          <Search className="size-5 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">{t('common.commandPalette.empty')}</p>
        </CommandEmpty>

        <CommandGroup heading={t('common.commandPalette.navigation')}>
          {NAV_ACTIONS.map((item) => {
            const Icon = item.icon
            const label = t(item.labelKey)
            return (
              <CommandItem
                key={item.to}
                value={`${label} ${item.keywords?.join(' ') ?? ''}`}
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
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border/60 bg-background px-1 font-mono text-[10px]">
              ↵
            </kbd>
            {t('common.commandPalette.hints.select')}
          </span>
          <span className="flex items-center gap-1">
            <kbd className="inline-flex h-4 items-center rounded border border-border/60 bg-background px-1 font-mono text-[10px]">
              Esc
            </kbd>
            {t('common.commandPalette.hints.close')}
          </span>
        </div>
        <span className="font-mono">fundavida</span>
      </CommandFooter>
    </CommandDialog>
  )
}
