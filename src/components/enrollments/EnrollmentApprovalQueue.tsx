import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { WorklistCard, type WorklistLimit } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import {
  useCourses,
  useEnrollments,
  useStudents,
  useApproveEnrollment,
  useRejectEnrollment,
} from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { fullName } from '@/lib/personName'
import { resolveQueries } from '@/lib/resolveQueries'

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
 * Requests read oldest first (FIFO). With a `limit` (the admin dashboard) it shows
 * only the longest-waiting rows and links to the full page; the count badge still
 * reports every pending request.
 */
export function EnrollmentApprovalQueue({ limit }: { limit?: WorklistLimit } = {}) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  // Every read rides the scope seam (ADR-0008): a Teacher's enrollments are their
  // own Courses' ('ownCourses'), their students those enrolled or requesting
  // there, their Courses their own; an admin's are all. Rows join all three, so
  // gate on all three (ADR-0030).
  const gate = resolveQueries([useEnrollments({}), useStudents(), useCourses()])
  const approveMutation = useApproveEnrollment()
  const rejectMutation = useRejectEnrollment()

  if (gate.isPending) return <SkeletonCard lines={3} />

  const [enrollments, students, courses] = gate.data
  const studentById = new Map(students.map((s) => [s.id, s]))
  const courseById = new Map(courses.map((c) => [c.id, c]))
  const approvedByCourse = new Map<string, number>()
  for (const e of enrollments) {
    if (e.status === 'approved') {
      approvedByCourse.set(e.courseId, (approvedByCourse.get(e.courseId) ?? 0) + 1)
    }
  }

  const rows: PendingRow[] = enrollments
    .filter((e) => e.status === 'pending')
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id))
    .map((enrollment) => {
      const student = studentById.get(enrollment.studentId)
      const course = courseById.get(enrollment.courseId)
      return {
        id: enrollment.id,
        studentName: student ? fullName(student) : '',
        courseName: course?.name ?? '',
        requestedAt: enrollment.requestedAt,
        isAtCapacity: Boolean(course && (approvedByCourse.get(course.id) ?? 0) >= course.capacity),
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

  const shown = limit ? rows.slice(0, limit.rows) : rows

  return (
    <WorklistCard
      title={t('enrollments.approvalQueue.title')}
      icon={UserPlus}
      count={rows.length}
      emptyLabel={t('enrollments.approvalQueue.empty')}
      viewAll={
        limit && rows.length > 0
          ? {
              to: limit.viewAllTo,
              label: t('dashboard.worklist.viewAllCount', { n: rows.length }),
            }
          : undefined
      }
      body={
        rows.length > 0 ? (
          <DataTable
            data={shown}
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
