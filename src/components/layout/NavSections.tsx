import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { groupNavByRole, type NavItem } from '@/constants/nav'
import type { Role } from '@/types'
import { cn } from '@/lib/utils'

// The single source for the grouped role nav (ADR-0010). Both the desktop aside
// (AppSidebar) and the mobile drawer (MobileNav) render this — one derivation via
// groupNavByRole, no copied list. `onNavigate` lets the drawer close on link click.
export function NavSections({
  role,
  className,
  onNavigate,
}: {
  role: Role
  className?: string
  onNavigate?: () => void
}) {
  const { t } = useTranslation()
  const groups = groupNavByRole(role)
  return (
    <nav className={cn('overflow-y-auto', className)}>
      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.section}>
            <h3 className="px-3 pb-1.5 text-[11px] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground/70">
              {t(`nav.sections.${group.section}`)}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink item={item} onNavigate={onNavigate} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  )
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-2.5 rounded-lg py-2 pl-3 pr-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary font-semibold text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors',
              isActive
                ? 'text-primary-foreground'
                : 'text-muted-foreground/70 group-hover:text-foreground'
            )}
          />
          <span className="truncate">{t(item.labelKey)}</span>
        </>
      )}
    </NavLink>
  )
}
