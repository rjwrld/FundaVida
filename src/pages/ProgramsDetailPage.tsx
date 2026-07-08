import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { NoResults } from '@/components/shared/NoResults'
import { CourseStateBadge } from '@/components/courses/CourseStateBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { useProgram, useCourses } from '@/hooks/api'

// A single Program plus the Courses that are cohorts of it (ADR-0015). Both the
// Program and its Course list come through the scope seam (useProgram /
// useCourses), never a raw store read: the Course list therefore reflects the
// viewer's Courses scope (admin: all, teacher: own, student: enrolled).
export function ProgramsDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: program, isLoading } = useProgram(id ?? '')
  const { data: courses = [] } = useCourses({ programId: id ?? '' })

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('programs.detail.loading')}</p>
  }

  if (!program) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('programs.detail.notFound')}</p>
        <Button asChild variant="outline">
          <Link to="/app/programs">{t('programs.detail.backToList')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('programs.detail.eyebrow')}
        title={program.name}
        description={program.description}
        action={
          <Button asChild variant="outline">
            <Link to="/app/programs">{t('programs.detail.backToList')}</Link>
          </Button>
        }
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('programs.detail.coursesTitle')}
        </h2>
        {courses.length === 0 ? (
          <NoResults message={t('programs.detail.noCourses')} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>{t('courses.list.columns.name')}</TableHead>
                  <TableHead>{t('courses.form.fields.level')}</TableHead>
                  <TableHead>{t('courses.form.fields.sede')}</TableHead>
                  <TableHead>{t('courses.form.fields.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id} className="h-12 hover:bg-muted/40">
                    <TableCell>
                      <Link to={`/app/courses/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>{t(`courses.level.${c.level}`)}</TableCell>
                    <TableCell>{c.sede}</TableCell>
                    <TableCell>
                      <CourseStateBadge course={c} className="text-xs" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  )
}
