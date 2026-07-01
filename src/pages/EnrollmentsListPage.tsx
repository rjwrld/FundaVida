import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { NoResults } from '@/components/shared/NoResults'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/shared/PageHeader'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { EnrollmentsEmpty } from '@/components/empty-states/EnrollmentsEmpty'
import { Pager } from '@/components/ui/pager'
import { usePagination } from '@/hooks/usePagination'
import {
  useApproveEnrollment,
  useDeleteEnrollment,
  useEnrollments,
  useRejectEnrollment,
} from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import { can } from '@/permissions'
import { shortCourseName } from '@/lib/courseName'
import { SEDES } from '@/constants/sede'
import type { Course, Enrollment, EnrollmentStatus, Student, Teacher } from '@/types'

const ANY_SEDE = '__all__'
// Status filter values: 'active' (the default) hides rejected enrollments; the
// other values narrow to a single status; 'all' shows everything.
type StatusFilter = 'active' | 'all' | EnrollmentStatus

function statusVariant(
  status: EnrollmentStatus
): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'rejected') return 'destructive'
  return 'outline'
}

export function EnrollmentsListPage() {
  const { t } = useTranslation()
  const role = useStore((s) => s.role)
  const currentUserId = useStore((s) => s.currentUserId)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const teachers = useStore((s) => s.teachers)

  const { data: enrollments = [], isLoading } = useEnrollments()
  const approve = useApproveEnrollment()
  const reject = useRejectEnrollment()
  const deleteEnrollment = useDeleteEnrollment()

  const [query, setQuery] = useState('')
  const [sedeFilter, setSedeFilter] = useState<string>(ANY_SEDE)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null)

  const canDelete = role
    ? can(role, 'delete', 'enrollments', { userId: currentUserId ?? undefined })
    : false
  const canApproveCourse = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId)
    return role
      ? can(role, 'approve', 'enrollments', { course, userId: currentUserId ?? undefined })
      : false
  }

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses])
  const teacherById = useMemo(() => new Map(teachers.map((tt) => [tt.id, tt])), [teachers])

  // Summary counts come from the whole (already role-scoped) list, not the
  // filtered view, so the chips read the same regardless of the active filters.
  const stats = useMemo(() => {
    const sedes = new Set<string>()
    const courseIds = new Set<string>()
    let pending = 0
    let approved = 0
    for (const e of enrollments) {
      const course = courseById.get(e.courseId)
      if (course) {
        sedes.add(course.sede)
        courseIds.add(course.id)
      }
      if (e.status === 'pending') pending += 1
      if (e.status === 'approved') approved += 1
    }
    return { pending, approved, sedes: sedes.size, courses: courseIds.size }
  }, [enrollments, courseById])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return enrollments.filter((e) => {
      const course = courseById.get(e.courseId)
      const student = studentById.get(e.studentId)
      if (!course || !student) return false
      if (sedeFilter !== ANY_SEDE && course.sede !== sedeFilter) return false
      if (statusFilter === 'active' && e.status === 'rejected') return false
      if (statusFilter !== 'active' && statusFilter !== 'all' && e.status !== statusFilter) {
        return false
      }
      if (q && !`${student.firstName} ${student.lastName}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [enrollments, courseById, studentById, sedeFilter, statusFilter, query])

  // Group the visible enrollments by Sede, then by Course (ADR-0023).
  const grouped = useMemo(() => {
    const bySede = new Map<string, Map<string, typeof visible>>()
    for (const e of visible) {
      const course = courseById.get(e.courseId)
      if (!course) continue
      const byCourse = bySede.get(course.sede) ?? new Map<string, typeof visible>()
      const rows = byCourse.get(course.id) ?? []
      rows.push(e)
      byCourse.set(course.id, rows)
      bySede.set(course.sede, byCourse)
    }
    return SEDES.flatMap((sede) => {
      const byCourse = bySede.get(sede)
      if (!byCourse) return []
      const courseGroups = [...byCourse.entries()]
        .flatMap(([courseId, rows]) => {
          const course = courseById.get(courseId)
          return course ? [{ course, rows }] : []
        })
        .sort((a, b) => a.course.name.localeCompare(b.course.name))
      const pendingCount = [...byCourse.values()]
        .flat()
        .filter((e) => e.status === 'pending').length
      return [{ sede, courseGroups, pendingCount }]
    })
  }, [visible, courseById])

  const hasFilters = query.trim() !== '' || sedeFilter !== ANY_SEDE || statusFilter !== 'active'

  const STATUS_OPTIONS: StatusFilter[] = [
    'active',
    'pending',
    'approved',
    'rejected',
    'withdrawn',
    'all',
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('enrollments.list.title')}
        description={t('enrollments.list.subtitle')}
      />

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ['pending', stats.pending],
            ['approved', stats.approved],
            ['sedes', stats.sedes],
            ['courses', stats.courses],
          ] as const
        ).map(([key, value]) => (
          <div key={key} className="rounded-lg bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">{t(`enrollments.list.stats.${key}`)}</p>
            <p className="font-mono text-xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <section aria-label={t('common.a11y.filters')} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('enrollments.list.searchPlaceholder')}
            aria-label={t('enrollments.list.searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Select value={sedeFilter} onValueChange={setSedeFilter}>
          <SelectTrigger className="sm:w-48" aria-label={t('enrollments.list.filterSede')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY_SEDE}>{t('enrollments.list.filterAnySede')}</SelectItem>
            {SEDES.map((sede) => (
              <SelectItem key={sede} value={sede}>
                {sede}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="sm:w-44" aria-label={t('enrollments.list.filterStatus')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`enrollments.list.statusFilter.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : grouped.length === 0 && !hasFilters ? (
        <EnrollmentsEmpty />
      ) : grouped.length === 0 ? (
        <NoResults message={t('enrollments.list.emptyFiltered')} />
      ) : (
        <div className="space-y-6">
          {grouped.map(({ sede, courseGroups, pendingCount }) => (
            <section key={sede} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight">{sede}</h2>
                {pendingCount > 0 && (
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {t('enrollments.list.pendingCount', { count: pendingCount })}
                  </span>
                )}
              </div>

              {courseGroups.map(({ course, rows }) => (
                <CourseEnrollmentGroup
                  key={course.id}
                  course={course}
                  rows={rows}
                  teacher={teacherById.get(course.teacherId)}
                  studentById={studentById}
                  canApprove={canApproveCourse(course.id)}
                  canDelete={canDelete}
                  approveDisabled={approve.isPending}
                  rejectDisabled={reject.isPending}
                  onApprove={(id) => approve.mutate(id)}
                  onReject={(id) => reject.mutate(id)}
                  onUnenroll={(payload) => setPendingDelete(payload)}
                />
              ))}
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('common.confirmDelete.title')}
        description={t('enrollments.list.unenrollConfirm')}
        confirmLabel={t('enrollments.list.unenroll')}
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteEnrollment.mutate(pendingDelete.id)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
      />
    </div>
  )
}

interface CourseEnrollmentGroupProps {
  course: Course
  rows: Enrollment[]
  teacher: Teacher | undefined
  studentById: Map<string, Student>
  canApprove: boolean
  canDelete: boolean
  approveDisabled: boolean
  rejectDisabled: boolean
  onApprove: (enrollmentId: string) => void
  onReject: (enrollmentId: string) => void
  onUnenroll: (payload: { id: string; name: string }) => void
}

/**
 * One Sede→Course card (ADR-0023). Its roster is windowed client-side (ADR-0026)
 * so a full cohort never dumps ~100 rows at once; the pager appears only once a
 * cohort exceeds a page. Pagination is presentation only — the rows arrive
 * already role-scoped and filtered.
 */
function CourseEnrollmentGroup({
  course,
  rows,
  teacher,
  studentById,
  canApprove,
  canDelete,
  approveDisabled,
  rejectDisabled,
  onApprove,
  onReject,
  onUnenroll,
}: CourseEnrollmentGroupProps) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const pagination = usePagination(rows, { pageSize: 10 })
  const coursePending = rows.filter((e) => e.status === 'pending').length

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/40 px-4 py-2.5">
        <div className="min-w-0">
          <span className="text-sm font-medium">{shortCourseName(course)}</span>
          {teacher && (
            <span className="ml-2 text-xs text-muted-foreground">
              {teacher.firstName} {teacher.lastName}
            </span>
          )}
        </div>
        {coursePending > 0 && (
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {t('enrollments.list.pendingCount', { count: coursePending })}
          </span>
        )}
      </div>
      <ul className="divide-y divide-border/60">
        {pagination.pageItems.map((e) => {
          const student = studentById.get(e.studentId)
          if (!student) return null
          const name = `${student.firstName} ${student.lastName}`
          return (
            <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {formatDate(e.enrolledAt)}
              </span>
              <Badge variant={statusVariant(e.status)} dot>
                {t(`enrollments.status.${e.status}`)}
              </Badge>
              <div className="flex gap-1">
                {e.status === 'pending' && canApprove && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onApprove(e.id)}
                      disabled={approveDisabled}
                      aria-label={t('enrollments.list.approveAria', { student: name })}
                    >
                      {t('common.actions.approve')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReject(e.id)}
                      disabled={rejectDisabled}
                      aria-label={t('enrollments.list.rejectAria', { student: name })}
                    >
                      {t('common.actions.reject')}
                    </Button>
                  </>
                )}
                {e.status === 'approved' && canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onUnenroll({ id: e.id, name })}
                    aria-label={t('common.actions.deleteItem', { name })}
                  >
                    {t('enrollments.list.unenroll')}
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      {pagination.pageCount > 1 && (
        <div className="border-t border-border/60 px-4 py-3">
          <Pager pagination={pagination} />
        </div>
      )}
    </div>
  )
}
