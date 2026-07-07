import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { StudentProgress } from '@/components/students/StudentProgress'
import {
  useAttendance,
  useCertificates,
  useCourses,
  useCurrentStudent,
  useEnrollments,
  useGrades,
} from '@/hooks/api'
import { useStore } from '@/data/store'
import { resolveQueries } from '@/lib/resolveQueries'
import { buildStudentProgress, type StudentProgressRow } from '@/lib/studentProgress'

/**
 * The Student's own self-service profile (/app/me, issue #166): a read-only "my
 * progress" hub mirroring the admin/teacher StudentsDetailPage sections, but read
 * entirely through the self-scoped seams (students:'self', enrollments:'own',
 * grades/certificates/attendance:'own'). A dedicated route — not the admin
 * students/:id page — keeps self-only structural (ADR-0008/0012): no Edit/Delete,
 * and a non-Student role is sent back to their dashboard. The shared
 * <StudentProgress> card is identical to StudentsDetailPage's; the scope seam is
 * this page's useCurrentStudent() vs that page's useStudent(id) (ADR-0032).
 */
export function MeProfilePage() {
  const { t } = useTranslation()
  const role = useStore((s) => s.role)
  const { data: student, isLoading } = useCurrentStudent()
  const studentId = student?.id ?? ''
  const enrollmentsQuery = useEnrollments({ studentId })
  const coursesQuery = useCourses()
  const gradesQuery = useGrades({ studentId })
  const attendanceQuery = useAttendance({ studentId })
  const certificatesQuery = useCertificates({ studentId })

  // Gate the progress roll-up on all five queries (ADR-0030/0032) so the join
  // never runs on `[]` placeholders; the section shows a skeleton (rows === null)
  // rather than a false notGraded row while they resolve.
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

  // Only a Student has a self-profile; any other role is redirected to their
  // dashboard. Branching on the synchronous role (not the async query) avoids a
  // flash of the loading state for admin/teacher/tcu.
  if (role && role !== 'student') return <Navigate to="/app" replace />

  if (isLoading) return <p className="text-sm text-muted-foreground">…</p>
  if (!student) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('me.title')}</p>
        <Button asChild variant="outline">
          <Link to="/app">{t('common.actions.backToHome')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <StudentProgress
      student={student}
      rows={rows}
      eyebrow={t('me.title')}
      action={
        <Button asChild variant="outline">
          <Link to="/app">{t('common.actions.backToHome')}</Link>
        </Button>
      }
    />
  )
}
