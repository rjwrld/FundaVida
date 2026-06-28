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

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{t('enrollments.approvalQueue.title')}</h2>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
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
            {pendingEnrollments.map((enrollment) => {
              const student = students.find((s) => s.id === enrollment.studentId)
              const course = courses.find((c) => c.id === enrollment.courseId)

              // Check if course is at capacity
              const approvedCount = enrollments.filter(
                (e) => e.courseId === enrollment.courseId && e.status === 'approved'
              ).length
              const isAtCapacity = course && approvedCount >= course.capacity

              return (
                <TableRow key={enrollment.id} className="h-12 hover:bg-muted/40">
                  <TableCell>
                    {student?.firstName} {student?.lastName}
                  </TableCell>
                  <TableCell>{course?.name}</TableCell>
                  <TableCell>{formatDate(enrollment.requestedAt)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approveMutation.mutate(enrollment.id)}
                      disabled={approveMutation.isPending || isAtCapacity}
                      title={
                        isAtCapacity ? t('enrollments.approvalQueue.capacityReached') : undefined
                      }
                      data-testid={`approve-${enrollment.id}`}
                    >
                      {t('common.actions.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => rejectMutation.mutate(enrollment.id)}
                      disabled={rejectMutation.isPending}
                      data-testid={`reject-${enrollment.id}`}
                    >
                      {t('common.actions.reject')}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
