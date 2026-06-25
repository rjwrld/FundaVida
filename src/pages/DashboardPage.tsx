import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard'
import { StudentDashboard } from '@/components/dashboard/StudentDashboard'
import { TcuDashboard } from '@/components/dashboard/TcuDashboard'
import { useCan } from '@/hooks/useCan'
import { useStore } from '@/data/store'
import type { Role } from '@/types'

export function DashboardPage() {
  const { t } = useTranslation()
  const roleOrNull = useStore((s) => s.role)
  const canViewAdminDashboard = useCan('view', 'reports')

  if (!roleOrNull) return null
  const role: Role = roleOrNull

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title', { role: t(`roles.${role}.label`) })}
        description={t('dashboard.subtitle')}
      />

      {canViewAdminDashboard && <AdminDashboard />}
      {!canViewAdminDashboard && role === 'teacher' && <TeacherDashboard />}
      {!canViewAdminDashboard && role === 'student' && <StudentDashboard />}
      {!canViewAdminDashboard && role === 'tcu' && <TcuDashboard />}
    </div>
  )
}
