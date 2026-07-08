import { GraduationCap, HeartHandshake, Presentation, ShieldCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/data/store'
import { landingPathForRole } from '@/lib/roleLanding'
import { ROLES } from '@/constants/roles'
import type { Role } from '@/types'

const ROLE_ICONS: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  teacher: Presentation,
  student: GraduationCap,
  tcu: HeartHandshake,
}

export function RoleSwitcher() {
  const role = useStore((s) => s.role)
  const setRole = useStore((s) => s.setRole)
  const navigate = useNavigate()
  const { t } = useTranslation()

  const current = ROLES.find((r) => r.value === role)
  const label = current
    ? t('roleSwitcher.current', { role: t(current.labelKey) })
    : t('roleSwitcher.choose')
  const Icon = current ? ROLE_ICONS[current.value] : Users

  function pick(next: Role) {
    setRole(next)
    navigate(landingPathForRole(next, useStore.getState()))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/*
          Below md the trigger collapses to an icon-only square so it stops
          hogging header width and painting over the brand on mobile (#271);
          the role stays reachable as the button's accessible name.
        */}
        <Button
          variant="outline"
          size="sm"
          aria-label={label}
          className="w-9 px-0 md:w-auto md:px-3"
        >
          <Icon className="md:hidden" aria-hidden />
          <span className="hidden md:inline">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t('roleSwitcher.switch')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r) => (
          <DropdownMenuItem key={r.value} onSelect={() => pick(r.value)}>
            {t(r.labelKey)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
