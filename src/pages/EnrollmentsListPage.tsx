import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useDeleteEnrollment, useEnrollments } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import type { EnrollmentFilters } from '@/data/api/enrollments'

export function EnrollmentsListPage() {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const [filters, setFilters] = useState<EnrollmentFilters>({})
  const { data = [], isLoading } = useEnrollments(filters)
  const deleteEnrollment = useDeleteEnrollment()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const canDelete = useCan('delete', 'enrollments')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const hasFilters = Boolean(filters.studentId || filters.courseId)
  const count = data.length
  const columnCount = canDelete ? 4 : 3

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('enrollments.list.title')}
        description={t('enrollments.list.subtitle')}
      />

      <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-2">
        <Select
          value={filters.studentId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, studentId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('enrollments.list.columns.student')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('enrollments.list.filterAnyStudent')}</SelectItem>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.courseId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, courseId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('enrollments.list.columns.course')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('enrollments.list.filterAnyCourse')}</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <SkeletonTable rows={8} columns={columnCount} />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? t('enrollments.list.emptyFiltered') : t('enrollments.list.empty')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('enrollments.list.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>{t('enrollments.list.columns.student')}</TableHead>
                <TableHead>{t('enrollments.list.columns.course')}</TableHead>
                <TableHead>{t('enrollments.list.columns.enrolledAt')}</TableHead>
                {canDelete && (
                  <TableHead className="text-right">
                    {t('enrollments.list.columns.actions')}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => {
                const s = students.find((x) => x.id === e.studentId)
                const c = courses.find((x) => x.id === e.courseId)
                const name = `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim()
                return (
                  <TableRow key={e.id} className="h-12 hover:bg-muted/40">
                    <TableCell>
                      {s?.firstName} {s?.lastName}
                    </TableCell>
                    <TableCell>{c?.name}</TableCell>
                    <TableCell>{formatDate(e.enrolledAt)}</TableCell>
                    {canDelete && (
                      <TableCell className="text-right">
                        <RowActions
                          deleteLabel={t('common.actions.deleteItem', { name })}
                          onDelete={() => setPendingDeleteId(e.id)}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title={t('common.confirmDelete.title')}
        description={t('enrollments.list.unenrollConfirm')}
        confirmLabel={t('enrollments.list.unenroll')}
        destructive
        onConfirm={() => {
          if (pendingDeleteId) deleteEnrollment.mutate(pendingDeleteId)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingDeleteId(null)
        }}
      />
    </div>
  )
}
