import {
  ChevronsUpDown,
  GraduationCap,
  HeartHandshake,
  Presentation,
  ShieldCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { useStore } from '@/data/store'
import { landingPathForRole } from '@/lib/roleLanding'
import { fullName } from '@/lib/personName'
import { ROLES } from '@/constants/roles'
import type { Role } from '@/types'

const ROLE_ICONS: Record<Role, LucideIcon> = {
  admin: ShieldCheck,
  teacher: Presentation,
  student: GraduationCap,
  tcu: HeartHandshake,
}

/**
 * The Sidebar block's footer slot, in the registry's NavUser shape. The demo has no
 * auth, so "the user" is the persona the role switch signed us in as: `currentUserId`
 * resolves to a Teacher, Student or TCU trainee record, and the switch itself is the
 * account menu. Admin has no person record — it renders as the role alone, one line.
 */
export function SidebarUser() {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const person = useStore((s) => {
    if (!userId) return undefined
    return (
      s.teachers.find((p) => p.id === userId) ??
      s.students.find((p) => p.id === userId) ??
      s.tcuTrainees.find((p) => p.id === userId)
    )
  })
  const setRole = useStore((s) => s.setRole)
  const { isMobile, setOpenMobile } = useSidebar()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!role) return null

  const current = ROLES.find((r) => r.value === role)
  const roleLabel = current ? t(current.labelKey) : t('roleSwitcher.choose')
  const name = person ? fullName(person) : roleLabel
  const Icon = ROLE_ICONS[role]

  function pick(next: Role) {
    setRole(next)
    setOpenMobile(false)
    navigate(landingPathForRole(next, useStore.getState()))
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  <Icon className="size-4" aria-hidden />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{name}</span>
                {person && (
                  <span className="truncate text-xs text-sidebar-foreground/70">{roleLabel}</span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {/* Anchored to the trigger: beside the rail on desktop, above the drawer's
              footer on mobile (where there is no room to the right). */}
          <DropdownMenuContent
            side={isMobile ? 'top' : 'right'}
            align="end"
            className="w-56 rounded-lg"
          >
            <DropdownMenuLabel>{t('roleSwitcher.switch')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {ROLES.map((r) => {
                const RoleIcon = ROLE_ICONS[r.value]
                return (
                  <DropdownMenuItem key={r.value} onSelect={() => pick(r.value)}>
                    <RoleIcon aria-hidden />
                    {t(r.labelKey)}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
