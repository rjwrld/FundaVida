import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { groupNavByRole, type NavItem } from '@/constants/nav'
import { useStore } from '@/data/store'
import { cn } from '@/lib/utils'
import { NeedHelpCard } from '@/components/layout/NeedHelpCard'

export function AppSidebar() {
  const role = useStore((s) => s.role)
  const { t } = useTranslation()
  if (!role) return null
  const groups = groupNavByRole(role)
  return (
    <aside
      aria-label={t('sidebar.sectionsAriaLabel')}
      className="hidden shrink-0 flex-col border-r border-border/60 bg-muted/20 md:flex md:w-60"
    >
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.section}>
              <h3 className="px-3 pb-1.5 text-[11px] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground/70">
                {t(`nav.sections.${group.section}`)}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <SidebarLink item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </nav>
      <NeedHelpCard />
    </aside>
  )
}

function SidebarLink({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
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
