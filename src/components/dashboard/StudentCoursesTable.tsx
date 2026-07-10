import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AnimatedNumber } from '@/components/shared/AnimatedNumber'
import { NoResults } from '@/components/shared/NoResults'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { CourseStateBadge } from '@/components/courses/CourseStateBadge'
import {
  useAttendance,
  useCertificates,
  useCourses,
  useCurrentStudent,
  useEnrollments,
  useGrades,
} from '@/hooks/api'
import { resolveQueries } from '@/lib/resolveQueries'
import { buildStudentProgress, type StudentProgressRow } from '@/lib/studentProgress'
import { shortCourseName } from '@/lib/courseName'
import { isPassingScore } from '@/lib/certificates'
import { useFormat } from '@/hooks/useFormat'

/**
 * The Student's "My courses" roll-up on the landing surface (ADR-0043): one row
 * per enrolled Course with its schedule, derived display-state badge (ADR-0042),
 * attendance rate, and Grade — the {@link buildStudentProgress} join (ADR-0032)
 * the admin/teacher StudentsDetailPage also renders, now the self view. Each row
 * deep-links to the Course detail. `/app/courses` keeps its browse-and-request
 * job; this table is the "how am I doing where" glance.
 *
 * Derives from six scoped reads (the current Student plus the five progress
 * lists) held behind {@link resolveQueries} (ADR-0030) so no `[]` window ever
 * flashes a false "not graded" row before the joins resolve.
 */
export function StudentCoursesTable() {
  const { t } = useTranslation()
  const { formatGrade, formatPercent } = useFormat()

  const { data: student } = useCurrentStudent()
  const studentId = student?.id ?? ''
  const enrollmentsQuery = useEnrollments({ studentId })
  const coursesQuery = useCourses()
  const gradesQuery = useGrades({ studentId })
  const attendanceQuery = useAttendance({ studentId })
  const certificatesQuery = useCertificates({ studentId })

  const gate = resolveQueries([
    enrollmentsQuery,
    coursesQuery,
    gradesQuery,
    attendanceQuery,
    certificatesQuery,
  ])

  const columns: DataTableColumn<StudentProgressRow>[] = [
    {
      id: 'course',
      header: t('dashboard.student.table.course'),
      cell: (row) => (
        <Link to={`/app/courses/${row.course.id}`} className="font-medium hover:underline">
          {shortCourseName(row.course)}
        </Link>
      ),
      sortable: true,
      sortAccessor: (row) => shortCourseName(row.course),
    },
    {
      id: 'schedule',
      header: t('dashboard.student.table.schedule'),
      cell: (row) => (
        <span className="text-muted-foreground">
          {row.course.meetingDays.map((d) => t(`courses.form.weekdays.${d}`)).join(', ') || '—'}
        </span>
      ),
    },
    {
      id: 'state',
      header: t('dashboard.student.table.state'),
      cell: (row) => <CourseStateBadge course={row.course} />,
    },
    {
      id: 'attendance',
      header: t('dashboard.student.table.attendance'),
      cell: (row) =>
        row.attendanceRate !== null ? (
          <div className="flex items-center gap-2">
            <Progress
              value={Math.round(row.attendanceRate * 100)}
              aria-label={t('dashboard.student.table.attendance')}
              className="h-1.5 w-16"
            />
            <AnimatedNumber
              value={row.attendanceRate}
              format={formatPercent}
              className="text-sm tabular-nums"
            />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      sortAccessor: (row) => row.attendanceRate ?? -1,
      sortable: true,
    },
    {
      id: 'grade',
      header: t('dashboard.student.table.grade'),
      cell: (row) =>
        row.grade ? (
          <span className="flex items-center gap-2">
            <AnimatedNumber value={row.grade.score} format={formatGrade} />
            {isPassingScore(row.grade.score) && (
              <Badge variant="success">{t('students.detail.enrollments.passing')}</Badge>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {t('students.detail.enrollments.notGraded')}
          </span>
        ),
      sortAccessor: (row) => row.grade?.score ?? -1,
      sortable: true,
    },
  ]

  // Header stays mounted across the loading gate so resolving it never shifts the
  // section; only the body swaps skeleton → table.
  let body: ReactNode
  if (gate.isPending) {
    body = <SkeletonTable columns={5} />
  } else {
    const [enrollments, courses, grades, attendance, certificates] = gate.data
    const rows = buildStudentProgress({ enrollments, courses, grades, attendance, certificates })
    body = (
      <DataTable
        data={rows}
        columns={columns}
        getRowKey={(row) => row.enrollment.id}
        emptyState={<NoResults message={t('dashboard.student.table.empty')} />}
        renderCard={(row) => <DataTableCard row={row} columns={columns} titleColumnId="course" />}
      />
    )
  }

  return (
    // `Card` renders a plain div, so the named region the old `<section>` carried
    // is restated here rather than dropped in the port.
    <Card role="region" aria-labelledby="my-courses-heading">
      <CardHeader>
        <CardTitle as="h3" id="my-courses-heading">
          {t('dashboard.student.table.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  )
}
