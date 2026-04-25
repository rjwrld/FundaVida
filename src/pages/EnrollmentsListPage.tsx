import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/PageHeader'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useDeleteEnrollment, useEnrollments } from '@/hooks/api'
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

  const hasFilters = Boolean(filters.studentId || filters.courseId)
  const count = data.length

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
        <SkeletonTable rows={8} columns={4} />
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
                <TableHead className="text-right">
                  {t('enrollments.list.columns.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => {
                const s = students.find((x) => x.id === e.studentId)
                const c = courses.find((x) => x.id === e.courseId)
                return (
                  <TableRow key={e.id} className="h-12 hover:bg-muted/40">
                    <TableCell>
                      {s?.firstName} {s?.lastName}
                    </TableCell>
                    <TableCell>{c?.name}</TableCell>
                    <TableCell>{formatDate(e.enrolledAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={t('common.actions.openMenu')}
                          >
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onSelect={() => {
                              if (confirm(t('enrollments.list.unenrollConfirm'))) {
                                deleteEnrollment.mutate(e.id)
                              }
                            }}
                          >
                            {t('enrollments.list.unenroll')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
