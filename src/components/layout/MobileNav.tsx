import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { NavSections } from '@/components/layout/NavSections'
import { NeedHelpCard } from '@/components/layout/NeedHelpCard'
import { useStore } from '@/data/store'

// The mobile complement to the desktop AppSidebar: a hamburger (visible md:hidden,
// the exact inverse of the aside's md:flex) that opens a left slide-in drawer. The
// drawer renders the same NavSections derivation — no copied list (ADR-0010).
export function MobileNav() {
  const role = useStore((s) => s.role)
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // Defensive close: any route change (nav link, back button, programmatic) drops
  // the drawer. A link click also closes via onNavigate, which covers navigating to
  // the current route (no pathname change, so this effect wouldn't fire).
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  // The hamburger hides at md (the desktop sidebar takes over), but an already-open
  // drawer would survive a resize past the breakpoint and float over the desktop
  // layout with no way to reopen its trigger. Close it the moment the viewport
  // crosses md. 768px mirrors Tailwind's md, the same breakpoint as the trigger's
  // md:hidden.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  if (!role) return null

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t('sidebar.openNav')}
          className="shrink-0 md:hidden"
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        aria-describedby={undefined}
        className="w-72 max-w-[85vw] border-border/60 p-0"
      >
        <SheetTitle className="sr-only">{t('sidebar.navAriaLabel')}</SheetTitle>
        <NavSections role={role} className="flex-1 px-3 py-5" onNavigate={() => setOpen(false)} />
        <NeedHelpCard />
      </SheetContent>
    </Sheet>
  )
}
