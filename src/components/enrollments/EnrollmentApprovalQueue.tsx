import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { WorklistCard } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { useEnrollments, useApproveEnrollment, useRejectEnrollment } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { useStore } from '@/data/store'
import { fullName } from '@/lib/personName'

interface PendingRow {
  id: string
  studentName: string
  courseName: string
  requestedAt: string
  isAtCapacity: boolean
}

/**
 * The queue of pending enrollment requests: a Teacher's own Courses, or every
 * request for an admin. A {@link WorklistCard} around a {@link DataTable} that
 * stays on screen with the compact empty state when nothing is waiting (ADR-0050).
 */
export function EnrollmentApprovalQueue() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const { data: enrollments = [], isPending } = useEnrollments({})
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

  if (isPending) return <SkeletonCard lines={3} />

  const rows: PendingRow[] = pendingEnrollments.map((enrollment) => {
    const student = students.find((s) => s.id === enrollment.studentId)
    const course = courses.find((c) => c.id === enrollment.courseId)
    const approvedCount = enrollments.filter(
      (e) => e.courseId === enrollment.courseId && e.status === 'approved'
    ).length
    return {
      id: enrollment.id,
      studentName: student ? fullName(student) : '',
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
      cell: (r) => {
        const approve = (
          <Button
            size="sm"
            variant="default"
            onClick={() => approveMutation.mutate(r.id)}
            disabled={approveMutation.isPending || r.isAtCapacity}
            aria-label={t('enrollments.list.approveAria', { student: r.studentName })}
            data-testid={`approve-${r.id}`}
          >
            {t('common.actions.approve')}
          </Button>
        )

        return (
          <div className="flex justify-end gap-2">
            {/* A disabled Button gets `pointer-events-none`, so it can never be a
                tooltip trigger itself — the at-capacity reason hangs off a
                focusable span wrapping it. Only the at-capacity row pays for
                that extra tab stop; every other row renders the bare Button. */}
            {r.isAtCapacity ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  {/* The span, not the Button, is the trigger: a disabled Button
                      carries `pointer-events-none`, so it can neither be hovered
                      nor focused and would never open the tooltip. `tabIndex`
                      makes the reason keyboard-reachable — which the `title=""`
                      this replaces never was. */}
                  {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
                  <span tabIndex={0} data-testid={`approve-${r.id}-reason`}>
                    {approve}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{t('enrollments.approvalQueue.capacityReached')}</TooltipContent>
              </Tooltip>
            ) : (
              approve
            )}
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
        )
      },
    },
  ]

  return (
    <WorklistCard
      title={t('enrollments.approvalQueue.title')}
      icon={UserPlus}
      count={rows.length}
      emptyLabel={t('enrollments.approvalQueue.empty')}
      body={
        rows.length > 0 ? (
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
        ) : undefined
      }
    />
  )
}
