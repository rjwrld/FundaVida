import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NoResults } from '@/components/shared/NoResults'
import { PageHeader } from '@/components/shared/PageHeader'
import { AnimatedNumber } from '@/components/shared/AnimatedNumber'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StudentCertificatesSection } from '@/components/students/StudentCertificatesSection'
import { useFormat } from '@/hooks/useFormat'
import { shortCourseName } from '@/lib/courseName'
import { isPassingScore } from '@/lib/certificates'
import { fullName } from '@/lib/personName'
import type { StudentProgressRow } from '@/lib/studentProgress'
import type { Student } from '@/types'

export interface StudentProgressProps {
  student: Student
  /**
   * The per-Course roll-up (ADR-0032). `null` while the five progress queries
   * are still resolving — the enrollments section shows a skeleton, never a
   * false `notGraded` row (the caller gates on `resolveQueries`, ADR-0030).
   */
  rows: StudentProgressRow[] | null
  /** PageHeader eyebrow — the page-specific label (`students.detail` vs `me`). */
  eyebrow: string
  /** PageHeader action slot — the page-specific controls (the scope seam, ADR-0012). */
  action: ReactNode
}

/**
 * The Student Progress hub, shared verbatim by the admin/teacher
 * StudentsDetailPage and the Student's own MeProfilePage (ADR-0032). Purely
 * presentational: it receives a resolved `student` and pre-joined `rows`, and
 * owns none of the query wiring. The `useStudent(id)` vs `useCurrentStudent()`
 * choice — the scope seam (ADR-0012) — stays on the page and reaches this card
 * only as the `eyebrow`/`action` props; there is deliberately no `mode` prop.
 */
export function StudentProgress({ student, rows, eyebrow, action }: StudentProgressProps) {
  const { t } = useTranslation()
  const { formatGrade, formatPercent } = useFormat()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={fullName(student)}
        description={student.email}
        action={action}
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
        {rows === null ? (
          <SkeletonTable columns={4} />
        ) : rows.length === 0 ? (
          <NoResults message={t('students.detail.sections.noEnrollments')} />
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
              {rows.map(({ enrollment, course, grade, certificate, attendanceRate }) => (
                <TableRow key={enrollment.id}>
                  <TableCell>
                    <Link to={`/app/courses/${course.id}`} className="hover:underline">
                      {shortCourseName(course)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {attendanceRate !== null ? (
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.round(attendanceRate * 100)}
                          aria-label={t('students.detail.enrollments.attendance')}
                          className="h-1.5 w-16"
                        />
                        <AnimatedNumber
                          value={attendanceRate}
                          format={formatPercent}
                          className="text-sm tabular-nums"
                        />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {grade ? (
                      <span className="flex items-center gap-2">
                        <AnimatedNumber value={grade.score} format={formatGrade} />
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
                    {certificate ? (
                      <Badge variant="success">{t('certificates.status.issued')}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
