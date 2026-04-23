import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { navItemsForRole } from '@/constants/nav'
import { useStore } from '@/data/store'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const role = useStore((s) => s.role)
  const { t } = useTranslation()
  if (!role) return null
  const items = navItemsForRole(role)
  return (
    <aside
      aria-label={t('sidebar.sectionsAriaLabel')}
      className="hidden w-56 shrink-0 border-r bg-muted/20 md:block"
    >
      <nav className="p-4 text-sm">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    isActive && 'bg-muted font-medium text-foreground'
                  )
                }
              >
                {t(item.labelKey)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
