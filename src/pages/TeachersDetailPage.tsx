import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTeacher } from '@/hooks/api'
import { useStore } from '@/data/store'

export function TeachersDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: teacher, isLoading } = useTeacher(id ?? '')
  const courses = useStore((s) => s.courses)

  if (isLoading) return <p className="text-sm text-muted-foreground">…</p>
  if (!teacher) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('teachers.detail.title')}</p>
        <Button asChild variant="outline">
          <Link to="/app/teachers">{t('common.actions.backToHome')}</Link>
        </Button>
      </div>
    )
  }

  const assigned = courses.filter((c) => teacher.courseIds.includes(c.id))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{teacher.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/teachers')}>
            {t('common.actions.backToHome')}
          </Button>
          <Button onClick={() => navigate(`/app/teachers/${teacher.id}/edit`)}>
            {t('teachers.detail.edit')}
          </Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('teachers.detail.sections.identity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t('teachers.form.fields.email')}:</span>{' '}
              {teacher.email}
            </p>
            <p>
              <span className="text-muted-foreground">{t('teachers.list.columns.courses')}:</span>{' '}
              {teacher.courseIds.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('teachers.detail.sections.courses')}</CardTitle>
          </CardHeader>
          <CardContent>
            {assigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('teachers.detail.sections.noCourses')}
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {assigned.map((c) => (
                  <li key={c.id}>
                    <Link to={`/app/courses/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {c.programName}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
