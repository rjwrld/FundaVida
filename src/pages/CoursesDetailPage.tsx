import { useState } from 'react'
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
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import {
  useAttendance,
  useCourse,
  useEnrollments,
  useGrades,
  useStudents,
  useUnenrollStudent,
} from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import { findSession } from '@/lib/sessions'
import type { AttendanceStatus } from '@/types'
import { GradeDialog } from '@/components/courses/GradeDialog'
import { EnrollStudentDialog } from '@/components/courses/EnrollStudentDialog'

interface GradingTarget {
  studentId: string
  studentName: string
  initialScore?: number
}

function statusVariant(status: AttendanceStatus): 'success' | 'destructive' | 'info' {
  if (status === 'present') return 'success'
  if (status === 'absent') return 'destructive'
  return 'info'
}

export function CoursesDetailPage() {
  const { t } = useTranslation()
  const { formatGrade, formatDate } = useFormat()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: course, isLoading } = useCourse(id ?? '')
  const teachers = useStore((s) => s.teachers)
  // The roster reads through the API/scope seam, never raw store collections
  // (ADR-0012): admin sees all, the Course's Teacher sees their own Course's
  // records, and a Student's scope collapses these to self (or empty).
  const { data: courseEnrollments = [] } = useEnrollments({ courseId: id ?? '' })
  const { data: scopedStudents = [] } = useStudents()
  const { data: scopedGrades = [] } = useGrades({ courseId: id ?? '' })
  const { data: ownAttendance = [] } = useAttendance({ courseId: id ?? '' })
  const unenroll = useUnenrollStudent()

  const [gradingTarget, setGradingTarget] = useState<GradingTarget | null>(null)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [pendingUnenroll, setPendingUnenroll] = useState<{
    id: string
    studentName: string
  } | null>(null)

  const canViewRoster = useCan('view', 'enrollments', { course: course || undefined })
  const canEdit = useCan('edit', 'courses')
  const canCreate = useCan('create', 'enrollments')
  const canEnter = useCan('enter', 'grades', { course: course || undefined })
  const canEditGrade = useCan('edit', 'grades', { course: course || undefined })
  const canDelete = useCan('delete', 'enrollments')

  if (isLoading)
    return <p className="text-sm text-muted-foreground">{t('courses.detail.loading')}</p>
  if (!course) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('courses.detail.title')}</p>
        <Button asChild variant="outline">
          <Link to="/app/courses">{t('common.actions.backToHome')}</Link>
        </Button>
      </div>
    )
  }

  const teacher = teachers.find((tt) => tt.id === course.teacherId)
  // For the Student self-view: scope 'own' already narrows scopedGrades to the
  // current Student, so this is their own Grade for the Course (or undefined).
  const ownGrade = scopedGrades.find((g) => g.courseId === course.id)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('courses.detail.title')}
        title={course.name}
        description={course.programName}
        action={
          <>
            <Button variant="outline" onClick={() => navigate('/app/courses')}>
              {t('common.actions.backToHome')}
            </Button>
            {canEdit && (
              <Button onClick={() => navigate(`/app/courses?edit=${course.id}`)}>
                {t('courses.detail.edit')}
              </Button>
            )}
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('courses.detail.sections.overview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.sede')}:</span>{' '}
              {course.sede}
            </p>
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.programName')}:</span>{' '}
              {course.programName}
            </p>
            <p>
              <span className="text-muted-foreground">{t('courses.form.fields.teacherId')}:</span>{' '}
              {teacher
                ? `${teacher.firstName} ${teacher.lastName}`
                : t('courses.detail.unassignedTeacher')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('courses.form.fields.description')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{course.description}</CardContent>
        </Card>
      </section>

      {canViewRoster && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">
              {t('courses.detail.sections.students')}
            </h2>
            {canCreate && (
              <Button size="sm" onClick={() => setEnrollOpen(true)}>
                {t('courses.detail.enrollButton')}
              </Button>
            )}
          </div>
          {courseEnrollments.length === 0 ? (
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              {t('courses.detail.sections.noStudents')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('courses.detail.enrolledTable.name')}</TableHead>
                  <TableHead>{t('courses.detail.enrolledTable.grade')}</TableHead>
                  {(canEnter || canEditGrade || canDelete) && (
                    <TableHead className="text-right">
                      {t('courses.detail.enrolledTable.actions')}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseEnrollments.map((e) => {
                  const student = scopedStudents.find((s) => s.id === e.studentId)
                  const grade = scopedGrades.find(
                    (g) => g.studentId === e.studentId && g.courseId === course.id
                  )
                  if (!student) return null
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <Link to={`/app/students/${student.id}`} className="hover:underline">
                          {student.firstName} {student.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {grade
                          ? formatGrade(grade.score)
                          : t('courses.detail.enrolledTable.notGraded')}
                      </TableCell>
                      {(canEnter || canEditGrade || canDelete) && (
                        <TableCell className="text-right">
                          {(grade ? canEditGrade : canEnter) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setGradingTarget({
                                  studentId: student.id,
                                  studentName: `${student.firstName} ${student.lastName}`,
                                  initialScore: grade?.score,
                                })
                              }
                            >
                              {t('courses.detail.enrolledTable.gradeButton')}
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setPendingUnenroll({
                                  id: e.id,
                                  studentName: `${student.firstName} ${student.lastName}`,
                                })
                              }
                            >
                              {t('courses.detail.enrolledTable.removeButton')}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </section>
      )}

      {!canViewRoster && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('courses.detail.sections.yourRecords')}
          </h2>
          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              <p>
                <span className="text-muted-foreground">
                  {t('courses.detail.enrolledTable.grade')}:
                </span>{' '}
                {ownGrade
                  ? formatGrade(ownGrade.score)
                  : t('courses.detail.enrolledTable.notGraded')}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-tight">
              {t('courses.detail.sections.yourAttendance')}
            </h3>
            {ownAttendance.length === 0 ? (
              <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                {t('attendance.list.empty')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('attendance.list.columns.session')}</TableHead>
                    <TableHead>{t('attendance.list.columns.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownAttendance.map((record) => {
                    const session = findSession(course, record.sessionDate)
                    const sessionLabel = session
                      ? `${t('attendance.list.session', { ordinal: String(session.ordinal) } as Record<string, string>)} · ${formatDate(record.sessionDate)}`
                      : formatDate(record.sessionDate)
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{sessionLabel}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(record.status)} dot>
                            {t(`attendance.list.status.${record.status}`)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </section>
      )}

      {gradingTarget && (
        <GradeDialog
          open
          onOpenChange={(v) => !v && setGradingTarget(null)}
          courseId={course.id}
          studentId={gradingTarget.studentId}
          studentName={gradingTarget.studentName}
          initialScore={gradingTarget.initialScore}
        />
      )}
      <EnrollStudentDialog open={enrollOpen} onOpenChange={setEnrollOpen} courseId={course.id} />

      <ConfirmDialog
        open={pendingUnenroll !== null}
        title={t('common.confirmDelete.title')}
        description={
          pendingUnenroll
            ? t('courses.detail.enrolledTable.removeConfirm', {
                student: pendingUnenroll.studentName,
              })
            : undefined
        }
        confirmLabel={t('courses.detail.enrolledTable.removeButton')}
        destructive
        onConfirm={() => {
          if (pendingUnenroll) unenroll.mutate(pendingUnenroll.id)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingUnenroll(null)
        }}
      />
    </div>
  )
}
