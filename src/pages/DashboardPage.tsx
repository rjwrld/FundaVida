import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'

function AdminCards() {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const students = useStore((s) => s.students.length)
  const teachers = useStore((s) => s.teachers.length)
  const courses = useStore((s) => s.courses.length)
  const grades = useStore((s) => s.grades.length)
  const entries: [string, number][] = [
    ['dashboard.admin.students', students],
    ['dashboard.admin.teachers', teachers],
    ['dashboard.admin.courses', courses],
    ['dashboard.admin.grades', grades],
  ]
  return (
    <section
      aria-labelledby="overview-heading"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
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
  if (!roleOrNull) return null
  const role = roleOrNull

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('dashboard.title', { role: t(`roles.${role}.label`) })}
        </h1>
        <p className="text-sm text-muted-foreground">{t('dashboard.subtitle')}</p>
      </header>
      {role === 'admin' && <AdminCards />}
      {role === 'teacher' && <TeacherCards />}
      {(role === 'student' || role === 'tcu') && <PlaceholderPanel role={role} />}
    </div>
  )
}
