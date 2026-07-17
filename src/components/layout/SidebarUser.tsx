import { flushSync } from 'react-dom'
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
import { useCurrentPersona } from '@/hooks/useCurrentPersona'
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
  // Gated on the role, not on the persona: `role` and `currentUserId` hydrate from two
  // independent storage keys (data/persistence.ts), so a half-written localStorage boots with
  // a role and no persona id — and this footer is the app's only role switch now that the
  // header's has gone. Gating on the id would hide the one control that repairs that state.
  // The person record is the enrichment it already is everywhere else: absent for admin too.
  const role = useStore((s) => s.role)
  const person = useCurrentPersona()?.person
  const setRole = useStore((s) => s.setRole)
  const { isMobile, setOpenMobile } = useSidebar()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!role) return null

  const current = ROLES.find((r) => r.value === role)
  const roleLabel = current ? t(current.labelKey) : t('roleSwitcher.choose')
  // Admin is a seat, not a person in the graph: it names itself with its role, on one line.
  const name = person ? fullName(person) : roleLabel
  const Icon = ROLE_ICONS[role]

  function pick(next: Role) {
    // Flip the role and navigate in ONE commit. `setRole` writes a Zustand store read
    // through `useSyncExternalStore`, which React may flush as its own synchronous
    // commit *before* the router's location update lands. On a Course detail page whose
    // destination is another Course detail (the Teacher golden-path landing, #72/#415)
    // that intermediate render pairs the new role with the *previous* `:id` — a course
    // the new role can't see — so the page reads a null course and, frozen by the
    // outlet's `AnimatePresence mode="wait"` exit, strands on the empty "not found"
    // fallback. `flushSync` collapses the whole switch into a single commit, so no render
    // ever pairs the new role with the old id. `setRole` updates the store synchronously,
    // so `getState()` inside the callback already carries the new persona for the landing.
    flushSync(() => {
      setOpenMobile(false)
      setRole(next)
      navigate(landingPathForRole(next, useStore.getState()))
    })
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
