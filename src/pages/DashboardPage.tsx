import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { AdminDashboard } from '@/components/dashboard/AdminDashboard'
import { useCan } from '@/hooks/useCan'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import type { Role } from '@/types'

function TeacherCards() {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const students = useStore((s) => s.students.length)
  const courses = useStore((s) => s.courses.filter((c) => c.teacherId === s.currentUserId).length)
  const entries: [string, number][] = [
    ['dashboard.teacher.myCourses', courses],
    ['dashboard.teacher.students', students],
  ]
  return (
    <section
      aria-labelledby="overview-heading"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 max-w-2xl"
    >
      <h2 id="overview-heading" className="sr-only">
        {t('dashboard.overviewHeading')}
      </h2>
      {entries.map(([labelKey, value]) => (
        <Card key={labelKey}>
          <CardHeader>
            <CardTitle>{t(labelKey)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(value)}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function PlaceholderPanel({ role }: { role: 'student' | 'tcu' }) {
  const { t } = useTranslation()
  const copy =
    role === 'student' ? t('dashboard.placeholder.studentCopy') : t('dashboard.placeholder.tcuCopy')
  return (
    <section aria-labelledby="overview-heading" className="max-w-2xl">
      <h2 id="overview-heading" className="sr-only">
        {t('dashboard.overviewHeading')}
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>
            {t('dashboard.placeholder.cardTitle', { role: t(`roles.${role}.label`) })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{copy}</p>
        </CardContent>
      </Card>
    </section>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const roleOrNull = useStore((s) => s.role)
  const canViewAdminDashboard = useCan('view', 'reports')
  const canViewTeacherCards = useCan('view', 'students')

  if (!roleOrNull) return null
  const role: Role = roleOrNull

  if (canViewAdminDashboard) {
    return <AdminDashboard />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title', { role: t(`roles.${role}.label`) })}
        description={t('dashboard.subtitle')}
      />
      {canViewTeacherCards && <TeacherCards />}
      {!canViewAdminDashboard && !canViewTeacherCards && (
        <PlaceholderPanel role={role as 'student' | 'tcu'} />
      )}
    </div>
  )
}
