import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { BrandLockup } from '@/components/brand/BrandLockup'
import { NeedHelpCard } from '@/components/layout/NeedHelpCard'
import { SidebarUser } from '@/components/layout/SidebarUser'
import { groupNavByRole, isNavItemActive } from '@/constants/nav'
import { useStore } from '@/data/store'
import { transitionGlide } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * The app shell's nav, on the registry Sidebar block (ADR-0047 phase 4a). One component
 * now serves both surfaces the hand-rolled aside + MobileNav used to split: below `md`
 * the block renders itself into a sheet, above it a collapsible icon rail (⌘/Ctrl+B,
 * state persisted — see `lib/sidebarState`). The items still derive from `NAV_ITEMS`
 * through the permission matrix (ADR-0010) — the block is presentation, the matrix is
 * truth — so a role switch re-derives the list with no copied list to keep in sync.
 *
 * The nav landmark wraps the block's children — brand row, sections and user footer alike —
 * rather than sitting on `SidebarContent` (which would leave the row and the footer as page
 * content inside no landmark at all, axe's `region` rule) and rather than riding `Sidebar`'s
 * own props: below `md` the block spreads those onto Radix's `Dialog` root, which destructures
 * the props it knows and drops the rest, so a `role`/`aria-label` handed to `<Sidebar>` reaches
 * the DOM on the desktop rail and silently vanishes in the drawer. Wrapping the children is the
 * one placement both surfaces render.
 */
export function AppSidebar() {
  const role = useStore((s) => s.role)
  const { pathname } = useLocation()
  const { isMobile, setOpenMobile } = useSidebar()
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  // Defensive close: any route change (back button, a programmatic navigate) drops the
  // drawer. A link tap also closes via its own onClick, which covers navigating to the
  // route we are already on — no pathname change for this effect to see.
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  // The block keeps `openMobile` set while the sheet is unmounted, so a drawer left open
  // across a resize past `md` would spring back the moment the viewport returned.
  useEffect(() => {
    if (!isMobile) setOpenMobile(false)
  }, [isMobile, setOpenMobile])

  if (!role) return null

  const groups = groupNavByRole(role)

  return (
    <Sidebar collapsible="icon">
      {/* `h-full min-h-0 flex-col` mirrors the container this replaces as the block's direct
          child, so SidebarContent keeps its flex-1 scroll region on both surfaces. */}
      <nav aria-label={t('sidebar.navAriaLabel')} className="flex h-full min-h-0 w-full flex-col">
        {/* The brand row the drawer gained in #293, now shared with the desktop rail: the
            lockup, plus — on mobile only — the close X as its flex sibling, since the block
            hides the sheet's own absolutely-positioned X. Collapsed to the icon rail, the
            mark stays and the wordmark drops. */}
        <SidebarHeader>
          <div className="flex h-10 items-center justify-between gap-2 px-1">
            <BrandLockup
              wordmark="always"
              wordmarkClassName="group-data-[collapsible=icon]:hidden"
              onClick={() => setOpenMobile(false)}
            />
            {isMobile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpenMobile(false)}
                className="shrink-0"
              >
                <X />
                <span className="sr-only">{t('common.actions.close')}</span>
              </Button>
            )}
          </div>
        </SidebarHeader>

        <SidebarContent>
          {groups.map((group) => (
            <SidebarGroup key={group.section}>
              <SidebarGroupLabel>{t(`nav.sections.${group.section}`)}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const active = isNavItemActive(pathname, item.to)
                    return (
                      <SidebarMenuItem key={item.to}>
                        {/* Phase 6a (ADR-0047): the active highlight is a shared `layoutId`
                          pill, so a route change glides it to the new item instead of
                          swapping backgrounds. The button's own active bg goes transparent
                          only while the pill carries it; under prefers-reduced-motion both
                          fall back to the block's static styling. `relative` keeps the link
                          content painting above the absolutely-positioned pill. */}
                        {active && !reduce && (
                          <motion.span
                            layoutId="sidebar-active-pill"
                            transition={transitionGlide}
                            aria-hidden="true"
                            data-slot="sidebar-active-pill"
                            className="absolute inset-0 rounded-md bg-sidebar-accent"
                          />
                        )}
                        {/* The drawer's links carry the ≥44px touch target (#292); the desktop
                        rail keeps the block's default density. */}
                        <SidebarMenuButton
                          asChild
                          size={isMobile ? 'lg' : 'default'}
                          isActive={active}
                          tooltip={t(item.labelKey)}
                          className={cn('relative', !reduce && 'data-[active=true]:bg-transparent')}
                        >
                          <NavLink
                            to={item.to}
                            end={item.to === '/app'}
                            onClick={() => setOpenMobile(false)}
                          >
                            <item.icon />
                            <span>{t(item.labelKey)}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          {/* Desktop only: on a phone the card ate ~150px and pushed the last nav section
              behind the scroll edge (#272), and it has no sensible collapsed-rail form. */}
          {!isMobile && <NeedHelpCard className="m-0 group-data-[collapsible=icon]:hidden" />}
          <SidebarUser />
        </SidebarFooter>
      </nav>
      {/* The rail is the pointer-only drag strip along the sidebar's edge. It is already
          untabbable (the block sets tabIndex -1), and it toggles exactly what the header
          trigger and ⌘/Ctrl+B do, so it is hidden from assistive tech rather than exposed
          as a second identically-named button. Its hover title stays, translated. */}
      <SidebarRail aria-hidden title={t('sidebar.toggle')} />
    </Sidebar>
  )
}
