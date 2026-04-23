import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCourse, useUnenrollStudent } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import { GradeDialog } from '@/components/courses/GradeDialog'
import { EnrollStudentDialog } from '@/components/courses/EnrollStudentDialog'

interface GradingTarget {
  studentId: string
  studentName: string
  initialScore?: number
}

export function CoursesDetailPage() {
  const { t } = useTranslation()
  const { formatGrade } = useFormat()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: course, isLoading } = useCourse(id ?? '')
  const role = useStore((s) => s.role)
  const students = useStore((s) => s.students)
  const teachers = useStore((s) => s.teachers)
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
  const unenroll = useUnenrollStudent()

  const [gradingTarget, setGradingTarget] = useState<GradingTarget | null>(null)
  const [enrollOpen, setEnrollOpen] = useState(false)

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
  const courseEnrollments = enrollments.filter((e) => e.courseId === course.id)
  const isAdmin = role === 'admin'
  const isTeacherOrAdmin = role === 'admin' || role === 'teacher'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{course.name}</h1>
          <p className="text-sm text-muted-foreground">{course.programName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/courses')}>
            {t('common.actions.backToHome')}
          </Button>
          {isAdmin && (
            <Button onClick={() => navigate(`/app/courses/${course.id}/edit`)}>
              {t('courses.detail.edit')}
            </Button>
          )}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('courses.detail.sections.overview')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">
                {t('courses.form.fields.headquartersName')}:
              </span>{' '}
              {course.headquartersName}
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

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('courses.detail.sections.students')}
          </h2>
          {isAdmin && (
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
                {isTeacherOrAdmin && (
                  <TableHead className="text-right">
                    {t('courses.detail.enrolledTable.actions')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {courseEnrollments.map((e) => {
                const student = students.find((s) => s.id === e.studentId)
                const grade = grades.find(
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
                    {isTeacherOrAdmin && (
                      <TableCell className="text-right">
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
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (
                                confirm(
                                  t('courses.detail.enrolledTable.removeConfirm', {
                                    student: `${student.firstName} ${student.lastName}`,
                                  })
                                )
                              ) {
                                unenroll.mutate(e.id)
                              }
                            }}
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
    </div>
  )
}
