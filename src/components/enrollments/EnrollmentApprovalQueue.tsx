import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { useEnrollments, useApproveEnrollment, useRejectEnrollment } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { useStore } from '@/data/store'

interface PendingRow {
  id: string
  studentName: string
  courseName: string
  requestedAt: string
  isAtCapacity: boolean
}

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

  const rows: PendingRow[] = pendingEnrollments.map((enrollment) => {
    const student = students.find((s) => s.id === enrollment.studentId)
    const course = courses.find((c) => c.id === enrollment.courseId)
    const approvedCount = enrollments.filter(
      (e) => e.courseId === enrollment.courseId && e.status === 'approved'
    ).length
    return {
      id: enrollment.id,
      studentName: `${student?.firstName ?? ''} ${student?.lastName ?? ''}`.trim(),
      courseName: course?.name ?? '',
      requestedAt: enrollment.requestedAt,
      isAtCapacity: Boolean(course && approvedCount >= course.capacity),
    }
  })

  // A single column set drives both the desktop table and the mobile cards
  // (via `renderCard`), so the two layouts can never drift. Both copies of a
  // row live in the DOM — one hidden per breakpoint — so the shared test ids
  // resolve to a single element only when scoped through the visible row.
  const columns: DataTableColumn<PendingRow>[] = [
    {
      id: 'student',
      header: t('enrollments.list.columns.student'),
      cell: (r) => r.studentName,
    },
    {
      id: 'course',
      header: t('enrollments.list.columns.course'),
      cell: (r) => r.courseName,
    },
    {
      id: 'enrolledAt',
      header: t('enrollments.list.columns.enrolledAt'),
      cell: (r) => formatDate(r.requestedAt),
    },
    {
      id: 'actions',
      header: t('enrollments.approvalQueue.actions'),
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={() => approveMutation.mutate(r.id)}
            disabled={approveMutation.isPending || r.isAtCapacity}
            title={r.isAtCapacity ? t('enrollments.approvalQueue.capacityReached') : undefined}
            aria-label={t('enrollments.list.approveAria', { student: r.studentName })}
            data-testid={`approve-${r.id}`}
          >
            {t('common.actions.approve')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => rejectMutation.mutate(r.id)}
            disabled={rejectMutation.isPending}
            aria-label={t('enrollments.list.rejectAria', { student: r.studentName })}
            data-testid={`reject-${r.id}`}
          >
            {t('common.actions.reject')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <section className="space-y-3">
      {/* An h3, like every sibling card on the TeacherDashboard — its only consumer. */}
      <h3 className="text-lg font-semibold">{t('enrollments.approvalQueue.title')}</h3>
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(r) => r.id}
        renderCard={(r) => (
          <DataTableCard
            row={r}
            columns={columns}
            titleColumnId="student"
            actionsColumnId="actions"
          />
        )}
      />
    </section>
  )
}
