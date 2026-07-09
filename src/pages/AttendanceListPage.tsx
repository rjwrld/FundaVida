import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { NoResults } from '@/components/shared/NoResults'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { AttendanceEmpty } from '@/components/empty-states/AttendanceEmpty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { useAttendance, useCourses, useStudents } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import { findSession } from '@/lib/sessions'
import { fullName } from '@/lib/personName'
import type { AttendanceFilters } from '@/data/api/attendance'
import type { AttendanceRecord, AttendanceStatus } from '@/types'

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

  const sessionLabelFor = (r: AttendanceRecord) => {
    const c = courses.find((x) => x.id === r.courseId)
    const session = c ? findSession(c, r.sessionDate) : null
    return session
      ? `${t('attendance.list.session', { ordinal: String(session.ordinal) } as Record<string, string>)} · ${formatDate(r.sessionDate)}`
      : formatDate(r.sessionDate)
  }

  const columns: DataTableColumn<AttendanceRecord>[] = [
    ...(showStudentColumn
      ? [
          {
            id: 'student',
            header: t('attendance.list.columns.student'),
            cell: (r: AttendanceRecord) => {
              const s = students.find((x) => x.id === r.studentId)
              return s ? fullName(s) : ''
            },
          },
        ]
      : []),
    {
      id: 'course',
      header: t('attendance.list.columns.course'),
      cell: (r) => courses.find((x) => x.id === r.courseId)?.name ?? '',
    },
    {
      id: 'session',
      header: t('attendance.list.columns.session'),
      cell: (r) => sessionLabelFor(r),
    },
    {
      id: 'status',
      header: t('attendance.list.columns.status'),
      cell: (r) => (
        <Badge variant={statusVariant(r.status)} dot>
          {t(`attendance.list.status.${r.status}`)}
        </Badge>
      ),
    },
  ]

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
            <SelectTrigger aria-label={t('attendance.list.filters.studentPlaceholder')}>
              <SelectValue placeholder={t('attendance.list.filters.studentPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('attendance.list.filters.anyStudent')}</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {fullName(s)}
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
          <SelectTrigger aria-label={t('attendance.list.filters.coursePlaceholder')}>
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
          <SelectTrigger aria-label={t('attendance.list.filters.statusPlaceholder')}>
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

      <ListView
        state={listViewState({ isLoading, count, hasFilters })}
        skeleton={<SkeletonTable rows={8} columns={4} />}
        empty={<AttendanceEmpty />}
        noResults={<NoResults message={t('attendance.list.emptyFiltered')} />}
        content={
          <DataTable
            data={data}
            columns={columns}
            getRowKey={(r) => r.id}
            renderCard={(r) => <DataTableCard row={r} columns={columns} titleColumnId="student" />}
          />
        }
      />
    </div>
  )
}
