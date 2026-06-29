import { useTranslation } from 'react-i18next'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useEnrollments, useApproveEnrollment, useRejectEnrollment } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { useStore } from '@/data/store'

/**
 * Renders an approval queue for pending enrollment requests.
 * For teachers, this shows pending requests for courses they own.
 * For admins, this shows all pending requests.
 * Only renders when there are pending requests.
 */
export function EnrollmentApprovalQueue() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const { data: enrollments = [] } = useEnrollments({})
  const approveMutation = useApproveEnrollment()
  const rejectMutation = useRejectEnrollment()

  // Get teacher's courses and pending requests for those courses
  const isTeacher = role === 'teacher'
  const teacherCourseIds = isTeacher
    ? courses.filter((c) => c.teacherId === userId).map((c) => c.id)
    : []

  // Filter to pending enrollments for the user's scope
  const pendingEnrollments = isTeacher
    ? enrollments.filter((e) => e.status === 'pending' && teacherCourseIds.includes(e.courseId))
    : role === 'admin'
      ? enrollments.filter((e) => e.status === 'pending')
      : []

  // Only render if there are pending enrollments
  if (pendingEnrollments.length === 0) {
    return null
  }

  const rows = pendingEnrollments.map((enrollment) => {
    const student = students.find((s) => s.id === enrollment.studentId)
    const course = courses.find((c) => c.id === enrollment.courseId)
    const approvedCount = enrollments.filter(
      (e) => e.courseId === enrollment.courseId && e.status === 'approved'
    ).length
    const isAtCapacity = Boolean(course && approvedCount >= course.capacity)
    const studentName = `${student?.firstName ?? ''} ${student?.lastName ?? ''}`.trim()
    return { enrollment, courseName: course?.name ?? '', studentName, isAtCapacity }
  })

  // `testId` is set only on the desktop table buttons: both layouts live in the DOM
  // (one hidden via CSS), so a shared test id would match twice.
  const approveButton = (
    enrollment: (typeof rows)[number]['enrollment'],
    isAtCapacity: boolean,
    opts?: { full?: boolean; testId?: boolean }
  ) => (
    <Button
      size="sm"
      variant="default"
      className={opts?.full ? 'flex-1' : undefined}
      onClick={() => approveMutation.mutate(enrollment.id)}
      disabled={approveMutation.isPending || isAtCapacity}
      title={isAtCapacity ? t('enrollments.approvalQueue.capacityReached') : undefined}
      data-testid={opts?.testId ? `approve-${enrollment.id}` : undefined}
    >
      {t('common.actions.approve')}
    </Button>
  )

  const rejectButton = (
    enrollment: (typeof rows)[number]['enrollment'],
    opts?: { full?: boolean; testId?: boolean }
  ) => (
    <Button
      size="sm"
      variant="outline"
      className={opts?.full ? 'flex-1' : undefined}
      onClick={() => rejectMutation.mutate(enrollment.id)}
      disabled={rejectMutation.isPending}
      data-testid={opts?.testId ? `reject-${enrollment.id}` : undefined}
    >
      {t('common.actions.reject')}
    </Button>
  )

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('enrollments.approvalQueue.title')}</h2>

      {/* Desktop: a dense table. Hidden on mobile, where columns would push the
          actions off-screen — the same rows render as stacked cards instead. */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-card sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>{t('enrollments.list.columns.student')}</TableHead>
              <TableHead>{t('enrollments.list.columns.course')}</TableHead>
              <TableHead>{t('enrollments.list.columns.enrolledAt')}</TableHead>
              <TableHead className="text-right">{t('enrollments.approvalQueue.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ enrollment, courseName, studentName, isAtCapacity }) => (
              <TableRow key={enrollment.id} className="h-12 hover:bg-muted/40">
                <TableCell>{studentName}</TableCell>
                <TableCell>{courseName}</TableCell>
                <TableCell>{formatDate(enrollment.requestedAt)}</TableCell>
                <TableCell className="space-x-2 text-right">
                  {approveButton(enrollment, isAtCapacity, { testId: true })}
                  {rejectButton(enrollment, { testId: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: one card per request with the actions full-width underneath. */}
      <ul className="space-y-3 sm:hidden">
        {rows.map(({ enrollment, courseName, studentName, isAtCapacity }) => (
          <li
            key={enrollment.id}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <p className="font-medium text-foreground">{studentName}</p>
            <p className="text-sm text-muted-foreground">{courseName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDate(enrollment.requestedAt)}
            </p>
            <div className="mt-3 flex gap-2">
              {approveButton(enrollment, isAtCapacity, { full: true })}
              {rejectButton(enrollment, { full: true })}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
