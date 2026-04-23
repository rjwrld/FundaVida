import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useDeleteEnrollment, useEnrollments } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { EnrollmentFilters } from '@/data/api/enrollments'

export function EnrollmentsListPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<EnrollmentFilters>({})
  const { data = [], isLoading } = useEnrollments(filters)
  const deleteEnrollment = useDeleteEnrollment()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('enrollments.list.title')}</h1>
      </header>

      <section aria-label="Filters" className="grid gap-3 sm:grid-cols-2">
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
            <SelectItem value="any">{t('enrollments.list.columns.student')}</SelectItem>
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
            <SelectItem value="any">{t('enrollments.list.columns.course')}</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('enrollments.list.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('enrollments.list.columns.student')}</TableHead>
              <TableHead>{t('enrollments.list.columns.course')}</TableHead>
              <TableHead>{t('enrollments.list.columns.enrolledAt')}</TableHead>
              <TableHead className="text-right">{t('enrollments.list.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => {
              const s = students.find((x) => x.id === e.studentId)
              const c = courses.find((x) => x.id === e.courseId)
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    {s?.firstName} {s?.lastName}
                  </TableCell>
                  <TableCell>{c?.name}</TableCell>
                  <TableCell>{new Date(e.enrolledAt).toLocaleDateString('en-US')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(t('enrollments.list.unenrollConfirm'))) {
                          deleteEnrollment.mutate(e.id)
                        }
                      }}
                    >
                      {t('enrollments.list.unenroll')}
                    </Button>
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
