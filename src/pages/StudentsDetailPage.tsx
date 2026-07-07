import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { StudentProgress } from '@/components/students/StudentProgress'
import {
  useAttendance,
  useCertificates,
  useCourses,
  useEnrollments,
  useGrades,
  useStudent,
} from '@/hooks/api'
import { resolveQueries } from '@/lib/resolveQueries'
import { buildStudentProgress, type StudentProgressRow } from '@/lib/studentProgress'

export function StudentsDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: student, isLoading } = useStudent(id ?? '')
  const enrollmentsQuery = useEnrollments({ studentId: id ?? '' })
  const coursesQuery = useCourses()
  const gradesQuery = useGrades({ studentId: id ?? '' })
  const attendanceQuery = useAttendance({ studentId: id ?? '' })
  const certificatesQuery = useCertificates({ studentId: id ?? '' })

  // The progress roll-up reads five queries; gate it on all of them so
  // buildStudentProgress never runs on `[]` placeholders and flashes a false
  // notGraded row (ADR-0030/0032). `null` rows → the section renders a skeleton.
  const progress = resolveQueries([
    enrollmentsQuery,
    coursesQuery,
    gradesQuery,
    attendanceQuery,
    certificatesQuery,
  ])
  let rows: StudentProgressRow[] | null = null
  if (!progress.isPending) {
    const [enrollments, courses, grades, attendance, certificates] = progress.data
    rows = buildStudentProgress({ enrollments, courses, grades, attendance, certificates })
  }

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

  return (
    <StudentProgress
      student={student}
      rows={rows}
      eyebrow={t('students.detail.title')}
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
  )
}
