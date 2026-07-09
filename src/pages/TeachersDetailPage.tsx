import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { NoResults } from '@/components/shared/NoResults'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useCertificates, useCourses, useEnrollments, useGrades, useTeacher } from '@/hooks/api'
import { resolveQueries } from '@/lib/resolveQueries'
import { useFormat } from '@/hooks/useFormat'
import { shortCourseName } from '@/lib/courseName'
import { fullName } from '@/lib/personName'

export function TeachersDetailPage() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const teacherQuery = useTeacher(id ?? '')
  // Courses and the per-course metrics read through the scope seam (ADR-0012),
  // never the raw store.
  const coursesQuery = useCourses()
  const enrollmentsQuery = useEnrollments()
  const gradesQuery = useGrades()
  const certificatesQuery = useCertificates()

  // Gate the render on every query the table reads, not the teacher query alone:
  // the roster/graded/certs cells derive from the four secondary queries, so
  // gating on `useTeacher` alone paints a `?? 0` placeholder in the window before
  // they resolve (ADR-0030). resolveQueries holds the whole page until all five
  // land, so no cell can flash a false 0.
  const resolved = resolveQueries([
    teacherQuery,
    coursesQuery,
    enrollmentsQuery,
    gradesQuery,
    certificatesQuery,
  ])

  if (resolved.isPending) return <p className="text-sm text-muted-foreground">…</p>
  const [teacher, courses, enrollments, grades, certificates] = resolved.data
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
  // Roster = approved Enrollments only (pending/rejected/withdrawn are not the class).
  const rosterByCourse = new Map<string, number>()
  for (const enrollment of enrollments) {
    if (enrollment.status !== 'approved') continue
    rosterByCourse.set(enrollment.courseId, (rosterByCourse.get(enrollment.courseId) ?? 0) + 1)
  }
  const gradedByCourse = new Map<string, number>()
  for (const grade of grades) {
    gradedByCourse.set(grade.courseId, (gradedByCourse.get(grade.courseId) ?? 0) + 1)
  }
  const certsByCourse = new Map<string, number>()
  for (const certificate of certificates) {
    certsByCourse.set(certificate.courseId, (certsByCourse.get(certificate.courseId) ?? 0) + 1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('teachers.detail.title')}
        title={fullName(teacher)}
        description={teacher.email}
        action={
          <>
            <Button variant="outline" onClick={() => navigate('/app/teachers')}>
              {t('common.actions.backToHome')}
            </Button>
            <Button onClick={() => navigate(`/app/teachers?edit=${teacher.id}`)}>
              {t('teachers.detail.edit')}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('teachers.detail.sections.identity')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">{t('teachers.form.fields.email')}:</span>{' '}
            {teacher.email}
          </p>
          <p>
            <span className="text-muted-foreground">{t('teachers.form.fields.sede')}:</span>{' '}
            {teacher.sede}
          </p>
          <p>
            <span className="text-muted-foreground">{t('teachers.form.fields.province')}:</span>{' '}
            {teacher.province}
          </p>
          <p>
            <span className="text-muted-foreground">{t('teachers.form.fields.canton')}:</span>{' '}
            {teacher.canton}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('teachers.detail.sections.courses')}
        </h2>
        {assigned.length === 0 ? (
          <NoResults message={t('teachers.detail.sections.noCourses')} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('teachers.detail.coursesTable.course')}</TableHead>
                <TableHead>{t('teachers.detail.coursesTable.status')}</TableHead>
                <TableHead>{t('teachers.detail.coursesTable.term')}</TableHead>
                <TableHead className="text-right">
                  {t('teachers.detail.coursesTable.roster')}
                </TableHead>
                <TableHead className="text-right">
                  {t('teachers.detail.coursesTable.graded')}
                </TableHead>
                <TableHead className="text-right">
                  {t('teachers.detail.coursesTable.certificates')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assigned.map((course) => (
                <TableRow key={course.id}>
                  <TableCell>
                    <Link to={`/app/courses/${course.id}`} className="hover:underline">
                      {shortCourseName(course)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CourseStateBadge course={course} />
                  </TableCell>
                  <TableCell data-testid="teacher-course-term">
                    <span className="whitespace-nowrap">
                      {formatDate(course.term.start)} – {formatDate(course.term.end)}
                    </span>
                    {course.meetingDays.length > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {course.meetingDays
                          .map((day) => t(`courses.form.weekdays.${day}`))
                          .join(', ')}
                      </span>
                    )}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    data-testid="teacher-course-roster"
                  >
                    {rosterByCourse.get(course.id) ?? 0}
                  </TableCell>
                  <TableCell
                    className="text-right tabular-nums"
                    data-testid="teacher-course-graded"
                  >
                    {gradedByCourse.get(course.id) ?? 0}
                  </TableCell>
                  <TableCell className="text-right tabular-nums" data-testid="teacher-course-certs">
                    {certsByCourse.get(course.id) ?? 0}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
