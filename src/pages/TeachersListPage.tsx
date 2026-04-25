import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { TeachersEmpty } from '@/components/empty-states/TeachersEmpty'
import { useDeleteTeacher, useTeachers } from '@/hooks/api'
import type { TeacherFilters } from '@/data/api/teachers'

export function TeachersListPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<TeacherFilters>({})
  const { data = [], isLoading } = useTeachers(filters)
  const deleteTeacher = useDeleteTeacher()
  const navigate = useNavigate()

  const hasFilters = Boolean(filters.search)
  const count = data.length

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('teachers.list.title')}
        description={t('teachers.list.subtitle')}
        action={
          <Button onClick={() => navigate('/app/teachers/new')}>
            <Plus size={16} className="mr-2" />
            {t('teachers.list.addButton')}
          </Button>
        }
      />

      <section aria-label={t('common.a11y.filters')}>
        <div className="relative max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            placeholder={t('teachers.list.searchPlaceholder')}
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
            className="pl-9"
          />
        </div>
      </section>

      {isLoading ? (
        <SkeletonTable rows={8} columns={4} />
      ) : count === 0 && !hasFilters ? (
        <TeachersEmpty onAdd={() => navigate('/app/teachers/new')} />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('teachers.list.emptyFiltered')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('teachers.list.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>{t('teachers.list.columns.name')}</TableHead>
                <TableHead>{t('teachers.list.columns.email')}</TableHead>
                <TableHead className="text-right">{t('teachers.list.columns.courses')}</TableHead>
                <TableHead className="text-right">{t('teachers.list.columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((teacher) => {
                const hasCourses = teacher.courseIds.length > 0
                return (
                  <TableRow key={teacher.id} className="h-12 hover:bg-muted/40">
                    <TableCell>
                      <Link to={`/app/teachers/${teacher.id}`} className="hover:underline">
                        {teacher.firstName} {teacher.lastName}
                      </Link>
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {teacher.courseIds.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={t('teachers.list.columns.actions')}
                          >
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onSelect={() => navigate(`/app/teachers/${teacher.id}/edit`)}
                          >
                            {t('teachers.detail.edit')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            aria-disabled={hasCourses}
                            aria-describedby={
                              hasCourses ? `teacher-${teacher.id}-delete-reason` : undefined
                            }
                            className={
                              hasCourses
                                ? 'text-destructive opacity-60 focus:bg-destructive/10 focus:text-destructive'
                                : 'text-destructive focus:bg-destructive/10 focus:text-destructive'
                            }
                            onSelect={async (event) => {
                              if (hasCourses) {
                                event.preventDefault()
                                alert(
                                  t('teachers.detail.cannotDeleteWithCourses', {
                                    count: teacher.courseIds.length,
                                  })
                                )
                                return
                              }
                              if (!confirm(t('teachers.detail.deleteConfirm'))) return
                              await deleteTeacher.mutateAsync(teacher.id)
                            }}
                          >
                            {t('common.actions.delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {hasCourses && (
                        <span id={`teacher-${teacher.id}-delete-reason`} className="sr-only">
                          {t('teachers.detail.cannotDeleteWithCourses', {
                            count: teacher.courseIds.length,
                          })}
                        </span>
                      )}
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
