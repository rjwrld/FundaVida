import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { useStudent } from '@/hooks/api'
import { useStore } from '@/data/store'

export function StudentsDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: student, isLoading } = useStudent(id ?? '')
  const courses = useStore((s) => s.courses)

  if (isLoading) return <p className="text-sm text-muted-foreground">…</p>
  if (!student) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('students.detail.title')}</p>
        <Button asChild variant="outline">
          <Link to="/app/students">{t('common.actions.backToHome')}</Link>
        </Button>
      </div>
    )
  }

  const enrolledCourses = courses.filter((c) => student.enrolledCourseIds.includes(c.id))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('students.detail.title')}
        title={`${student.firstName} ${student.lastName}`}
        description={student.email}
        action={
          <>
            <Button variant="outline" onClick={() => navigate('/app/students')}>
              {t('common.actions.backToHome')}
            </Button>
            <Button onClick={() => navigate(`/app/students/${student.id}/edit`)}>
              {t('students.detail.edit')}
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('students.detail.sections.identity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t('students.form.fields.province')}:</span>{' '}
              {student.province}
            </p>
            <p>
              <span className="text-muted-foreground">{t('students.form.fields.canton')}:</span>{' '}
              {student.canton}
            </p>
            <p>
              <span className="text-muted-foreground">
                {t('students.form.fields.educationalLevel')}:
              </span>{' '}
              {t(`students.form.level.${student.educationalLevel}`)}
            </p>
            <p>
              <span className="text-muted-foreground">{t('students.form.fields.gender')}:</span>{' '}
              {t(`students.form.gender.${student.gender}`)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('students.detail.sections.enrollments')}</CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('students.detail.sections.noEnrollments')}
              </p>
            ) : (
              <ul className="space-y-1 text-sm">
                {enrolledCourses.map((c) => (
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
