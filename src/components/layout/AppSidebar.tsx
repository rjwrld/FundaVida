import { useTranslation } from 'react-i18next'
import { useStore } from '@/data/store'
import { NavSections } from '@/components/layout/NavSections'
import { NeedHelpCard } from '@/components/layout/NeedHelpCard'

export function AppSidebar() {
  const role = useStore((s) => s.role)
  const { t } = useTranslation()
  if (!role) return null
  return (
    <aside
      aria-label={t('sidebar.sectionsAriaLabel')}
      className="hidden shrink-0 flex-col border-r border-border/60 bg-muted/20 md:flex md:w-60"
    >
      <NavSections role={role} className="flex-1 px-3 py-5" />
      <NeedHelpCard />
    </aside>
  )
}
