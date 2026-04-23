import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { useCourses, useDeleteCourse } from '@/hooks/api'
import { HEADQUARTERS, PROGRAMS } from '@/constants/course'
import type { CourseFilters } from '@/data/api/courses'
import { useStore } from '@/data/store'

export function CoursesListPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<CourseFilters>({})
  const { data = [], isLoading } = useCourses(filters)
  const deleteCourse = useDeleteCourse()
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const teachers = useStore((s) => s.teachers)
  const isAdmin = role === 'admin'

  const teacherName = (teacherId: string) => {
    const teacher = teachers.find((x) => x.id === teacherId)
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : teacherId
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('courses.list.title')}</h1>
        </div>
        {isAdmin && (
          <Button onClick={() => navigate('/app/courses/new')}>
            {t('courses.list.addButton')}
          </Button>
        )}
      </header>

      <section aria-label="Filters" className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder={t('students.list.searchPlaceholder')}
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
        />
        <Select
          value={filters.headquartersName ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, headquartersName: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger aria-label={t('courses.form.fields.headquartersName')}>
            <SelectValue placeholder={t('courses.form.fields.headquartersName')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('courses.form.fields.headquartersName')}</SelectItem>
            {HEADQUARTERS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.programName ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, programName: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger aria-label={t('courses.list.columns.program')}>
            <SelectValue placeholder={t('courses.list.columns.program')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('courses.list.columns.program')}</SelectItem>
            {PROGRAMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('courses.list.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('courses.list.columns.name')}</TableHead>
              <TableHead>{t('courses.list.columns.program')}</TableHead>
              <TableHead>{t('courses.form.fields.headquartersName')}</TableHead>
              <TableHead>{t('courses.list.columns.teacher')}</TableHead>
              {isAdmin && (
                <TableHead className="text-right">{t('courses.list.columns.actions')}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to={`/app/courses/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.programName}</TableCell>
                <TableCell>{c.headquartersName}</TableCell>
                <TableCell>{teacherName(c.teacherId)}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/app/courses/${c.id}/edit`)}
                    >
                      {t('courses.detail.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(t('courses.detail.deleteConfirm'))) {
                          deleteCourse.mutate(c.id)
                        }
                      }}
                    >
                      {t('common.actions.delete')}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
