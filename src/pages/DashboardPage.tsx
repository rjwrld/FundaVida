import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard'
import { StudentDashboard } from '@/components/dashboard/StudentDashboard'
import { TcuDashboard } from '@/components/dashboard/TcuDashboard'
import { useCurrentPersona } from '@/hooks/useCurrentPersona'

export function DashboardPage() {
  const { t } = useTranslation()
  const persona = useCurrentPersona()

  if (!persona) return null
  const { role, person } = persona

  // The H1 greets the person behind the persona (ADR-0050). Admin is a seat,
  // not someone in the seeded graph, so it — and any persona without a record —
  // reads plainly "Dashboard".
  const title =
    role !== 'admin' && person
      ? t('dashboard.greeting', { name: person.firstName })
      : t('nav.dashboard')

  return (
    <div className="space-y-6">
      <PageHeader title={title} />

      {role === 'admin' && <AdminDashboard />}
      {role === 'teacher' && <TeacherDashboard />}
      {role === 'student' && <StudentDashboard />}
      {role === 'tcu' && <TcuDashboard />}
    </div>
  )
}
