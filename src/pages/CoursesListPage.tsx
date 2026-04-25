import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/PageHeader'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { CoursesEmpty } from '@/components/empty-states/CoursesEmpty'
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

  const hasFilters = Boolean(filters.search || filters.headquartersName || filters.programName)
  const count = data.length
  const columnCount = isAdmin ? 5 : 4

  const teacherName = (teacherId: string) => {
    const teacher = teachers.find((x) => x.id === teacherId)
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : teacherId
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('courses.list.title')}
        description={t('courses.list.subtitle')}
        action={
          isAdmin ? (
            <Button onClick={() => navigate('/app/courses/new')}>
              <Plus size={16} className="mr-2" />
              {t('courses.list.addButton')}
            </Button>
          ) : null
        }
      />

      <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t('courses.list.searchPlaceholder')}
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
            className="pl-9"
          />
        </div>
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
        <SkeletonTable rows={8} columns={columnCount} />
      ) : count === 0 && !hasFilters ? (
        <CoursesEmpty onAdd={isAdmin ? () => navigate('/app/courses/new') : undefined} />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('courses.list.emptyFiltered')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('courses.list.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
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
                <TableRow key={c.id} className="h-12 hover:bg-muted/40">
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
                          <DropdownMenuItem onSelect={() => navigate(`/app/courses/${c.id}/edit`)}>
                            {t('courses.detail.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onSelect={() => {
                              if (confirm(t('courses.detail.deleteConfirm'))) {
                                deleteCourse.mutate(c.id)
                              }
                            }}
                          >
                            {t('common.actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
