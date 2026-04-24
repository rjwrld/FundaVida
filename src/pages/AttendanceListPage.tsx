import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/PageHeader'
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
import { useAttendance } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import type { AttendanceFilters } from '@/data/api/attendance'
import type { AttendanceStatus } from '@/types'

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'excused']

function statusVariant(
  status: AttendanceStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'present') return 'default'
  if (status === 'absent') return 'destructive'
  return 'secondary'
}

export function AttendanceListPage() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const role = useStore((s) => s.role)
  const [filters, setFilters] = useState<AttendanceFilters>({})
  const { data = [], isLoading } = useAttendance(filters)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)

  const hasFilters = Boolean(filters.studentId || filters.courseId || filters.status)

  return (
    <div className="space-y-6">
      <PageHeader title={t('attendance.list.title')} description={t('attendance.list.subtitle')} />

      <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-3">
        {role === 'admin' && (
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
        <p className="text-sm text-muted-foreground">…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? t('attendance.list.emptyFiltered') : t('attendance.list.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('attendance.list.columns.student')}</TableHead>
              <TableHead>{t('attendance.list.columns.course')}</TableHead>
              <TableHead>{t('attendance.list.columns.date')}</TableHead>
              <TableHead>{t('attendance.list.columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => {
              const s = students.find((x) => x.id === r.studentId)
              const c = courses.find((x) => x.id === r.courseId)
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    {s?.firstName} {s?.lastName}
                  </TableCell>
                  <TableCell>{c?.name}</TableCell>
                  <TableCell>{formatDate(r.sessionDate)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>
                      {t(`attendance.list.status.${r.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
