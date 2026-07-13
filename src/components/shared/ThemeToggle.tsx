import { useRef } from 'react'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { applyTheme, resolvesDark, useTheme, type Theme } from '@/hooks/useTheme'
import { themeWipe } from '@/lib/themeWipe'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const icons: Record<Theme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const ActiveIcon = icons[theme]

  // The circular wipe (ADR-0047 phase 6b) plays only when the resolved theme
  // actually flips — choosing e.g. "system" on a light OS from "light" is a
  // no-op on screen and gets no transition. The root-class flip runs inside
  // the wipe callback; `setTheme` there keeps state and storage in step.
  const choose = (next: Theme) => {
    if (resolvesDark(next) === document.documentElement.classList.contains('dark')) {
      setTheme(next)
      return
    }
    const rect = triggerRef.current?.getBoundingClientRect()
    themeWipe(
      () => {
        applyTheme(next)
        setTheme(next)
      },
      rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={t('common.theme.toggle')}>
          <ActiveIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => choose('light')}>
          <Sun />
          {t('common.theme.light')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => choose('dark')}>
          <Moon />
          {t('common.theme.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => choose('system')}>
          <Monitor />
          {t('common.theme.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
