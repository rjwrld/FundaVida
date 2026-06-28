import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAttendance, useCourses, useStudents } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import { findSession } from '@/lib/sessions'
import type { AttendanceFilters } from '@/data/api/attendance'
import type { AttendanceStatus } from '@/types'

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'excused']

function statusVariant(status: AttendanceStatus): 'success' | 'destructive' | 'info' {
  if (status === 'present') return 'success'
  if (status === 'absent') return 'destructive'
  return 'info'
}

export function AttendanceListPage() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const [searchParams] = useSearchParams()
  // The role-scoped calendar links a Teacher/admin into a Session's attendance,
  // pre-filtered to that Course (ADR-0013). No deep-linkable per-Session route exists.
  const [filters, setFilters] = useState<AttendanceFilters>(() => {
    const courseId = searchParams.get('courseId')
    return courseId ? { courseId } : {}
  })
  const { data = [], isLoading } = useAttendance(filters)
  const { data: students = [] } = useStudents()
  const { data: courses = [] } = useCourses()
  const role = useStore((s) => s.role)

  // A Student's attendance view is self-only (ADR-0012): every row is themselves,
  // and they can't resolve the student roster — so the Student identity column would
  // only ever render an empty cell. Show it for the teacher/admin roster views only.
  const showStudentColumn = role !== 'student'
  // The student filter is an admin triage aid across the whole roster; teachers
  // are already scoped to their own students, so it stays admin-only. (Gating on
  // role rather than students.length keeps it deterministic regardless of whether
  // the students query is already cache-warm.)
  const showStudentFilter = role === 'admin' && students.length > 0
  const hasFilters = Boolean(filters.studentId || filters.courseId || filters.status)
  const count = data.length

  return (
    <div className="space-y-6">
      <PageHeader title={t('attendance.list.title')} description={t('attendance.list.subtitle')} />

      <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-3">
        {showStudentFilter && (
          <Select
            value={filters.studentId ?? 'any'}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, studentId: v === 'any' ? undefined : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('attendance.list.filters.studentPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('attendance.list.filters.anyStudent')}</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.courseId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, courseId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('attendance.list.filters.coursePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('attendance.list.filters.anyCourse')}</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === 'any' ? undefined : (v as AttendanceStatus) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('attendance.list.filters.statusPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('attendance.list.filters.anyStatus')}</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`attendance.list.status.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <SkeletonTable rows={8} columns={4} />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? t('attendance.list.emptyFiltered') : t('attendance.list.empty')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('attendance.list.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                {showStudentColumn && <TableHead>{t('attendance.list.columns.student')}</TableHead>}
                <TableHead>{t('attendance.list.columns.course')}</TableHead>
                <TableHead>{t('attendance.list.columns.session')}</TableHead>
                <TableHead>{t('attendance.list.columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => {
                const s = students.find((x) => x.id === r.studentId)
                const c = courses.find((x) => x.id === r.courseId)
                const session = c ? findSession(c, r.sessionDate) : null
                const sessionLabel = session
                  ? `${t('attendance.list.session', { ordinal: String(session.ordinal) } as Record<string, string>)} · ${formatDate(r.sessionDate)}`
                  : formatDate(r.sessionDate)

                return (
                  <TableRow key={r.id} className="h-12 hover:bg-muted/40">
                    {showStudentColumn && (
                      <TableCell>
                        {s?.firstName} {s?.lastName}
                      </TableCell>
                    )}
                    <TableCell>{c?.name}</TableCell>
                    <TableCell>{sessionLabel}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)} dot>
                        {t(`attendance.list.status.${r.status}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
