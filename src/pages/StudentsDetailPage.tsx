import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { StudentCertificatesSection } from '@/components/students/StudentCertificatesSection'
import {
  useAttendance,
  useCertificates,
  useCourses,
  useEnrollments,
  useGrades,
  useStudent,
} from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { shortCourseName } from '@/lib/courseName'
import { isPassingScore } from '@/lib/certificates'
import type { Course, Enrollment } from '@/types'

export function StudentsDetailPage() {
  const { t } = useTranslation()
  const { formatGrade, formatPercent } = useFormat()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: student, isLoading } = useStudent(id ?? '')
  const { data: enrollments = [] } = useEnrollments({ studentId: id ?? '' })
  const { data: courses = [] } = useCourses()
  const { data: grades = [] } = useGrades({ studentId: id ?? '' })
  const { data: attendance = [] } = useAttendance({ studentId: id ?? '' })
  const { data: certificates = [] } = useCertificates({ studentId: id ?? '' })

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

  const courseById = new Map(courses.map((c) => [c.id, c]))
  const gradeByCourse = new Map(grades.map((g) => [g.courseId, g]))
  const certByCourse = new Map(certificates.map((c) => [c.courseId, c]))
  const attendanceByCourse = new Map<string, { total: number; present: number }>()
  for (const record of attendance) {
    const bucket = attendanceByCourse.get(record.courseId) ?? { total: 0, present: 0 }
    bucket.total += 1
    if (record.status === 'present') bucket.present += 1
    attendanceByCourse.set(record.courseId, bucket)
  }
  const enrollmentRows: { enrollment: Enrollment; course: Course }[] = []
  for (const enrollment of enrollments) {
    const course = courseById.get(enrollment.courseId)
    if (!course) continue
    enrollmentRows.push({ enrollment, course })
  }

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
            <Button onClick={() => navigate(`/app/students?edit=${student.id}`)}>
              {t('students.detail.edit')}
            </Button>
          </>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('students.detail.sections.identity')}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">{t('students.form.fields.sede')}:</span>{' '}
            {student.sede}
          </p>
          <p>
            <span className="text-muted-foreground">
              {t('students.form.fields.educationalLevel')}:
            </span>{' '}
            {t(`students.form.level.${student.educationalLevel}`)}
          </p>
          <p>
            <span className="text-muted-foreground">{t('students.form.fields.province')}:</span>{' '}
            {student.province}
          </p>
          <p>
            <span className="text-muted-foreground">{t('students.form.fields.canton')}:</span>{' '}
            {student.canton}
          </p>
          <p>
            <span className="text-muted-foreground">{t('students.form.fields.gender')}:</span>{' '}
            {t(`students.form.gender.${student.gender}`)}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('students.detail.sections.enrollments')}
        </h2>
        {enrollmentRows.length === 0 ? (
          <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t('students.detail.sections.noEnrollments')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('students.detail.enrollments.course')}</TableHead>
                <TableHead>{t('students.detail.enrollments.attendance')}</TableHead>
                <TableHead>{t('students.detail.enrollments.grade')}</TableHead>
                <TableHead>{t('students.detail.enrollments.certificate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollmentRows.map(({ enrollment, course }) => {
                const grade = gradeByCourse.get(course.id)
                const attendanceBucket = attendanceByCourse.get(course.id)
                const cert = certByCourse.get(course.id)
                return (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <Link to={`/app/courses/${course.id}`} className="hover:underline">
                        {shortCourseName(course)}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {attendanceBucket ? (
                        formatPercent(attendanceBucket.present / attendanceBucket.total)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {grade ? (
                        <span className="flex items-center gap-2">
                          <span>{formatGrade(grade.score)}</span>
                          {isPassingScore(grade.score) && (
                            <Badge variant="success">
                              {t('students.detail.enrollments.passing')}
                            </Badge>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {t('students.detail.enrollments.notGraded')}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cert ? (
                        <Badge variant="success">{t('certificates.status.issued')}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <StudentCertificatesSection student={student} />

      <Card>
        <CardHeader>
          <CardTitle>{t('students.detail.sections.guardian')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">{t('students.form.fields.guardianName')}:</span>{' '}
            {student.guardian.name}
          </p>
          <p>
            <span className="text-muted-foreground">
              {t('students.form.fields.guardianRelationship')}:
            </span>{' '}
            {t(`students.form.guardian.relationship.${student.guardian.relationship}`)}
          </p>
          <p>
            <span className="text-muted-foreground">
              {t('students.form.fields.guardianPhone')}:
            </span>{' '}
            {student.guardian.phone}
          </p>
          <p>
            <span className="text-muted-foreground">
              {t('students.form.fields.guardianEmail')}:
            </span>{' '}
            {student.guardian.email}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
