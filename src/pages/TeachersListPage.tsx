import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { useDeleteTeacher, useTeachers } from '@/hooks/api'
import type { TeacherFilters } from '@/data/api/teachers'

export function TeachersListPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<TeacherFilters>({})
  const { data = [], isLoading } = useTeachers(filters)
  const deleteTeacher = useDeleteTeacher()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t('teachers.list.title')}</h1>
        </div>
        <Button onClick={() => navigate('/app/teachers/new')}>
          {t('teachers.list.addButton')}
        </Button>
      </header>

      <section aria-label="Filters">
        <Input
          placeholder={t('students.list.searchPlaceholder')}
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          className="max-w-sm"
        />
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('teachers.list.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('teachers.list.columns.name')}</TableHead>
              <TableHead>{t('teachers.list.columns.email')}</TableHead>
              <TableHead>{t('teachers.list.columns.courses')}</TableHead>
              <TableHead className="text-right">{t('teachers.list.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((teacher) => {
              const hasCourses = teacher.courseIds.length > 0
              return (
                <TableRow key={teacher.id}>
                  <TableCell>
                    <Link to={`/app/teachers/${teacher.id}`} className="hover:underline">
                      {teacher.firstName} {teacher.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.courseIds.length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/app/teachers/${teacher.id}/edit`)}
                    >
                      {t('teachers.detail.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-disabled={hasCourses}
                      aria-describedby={
                        hasCourses ? `teacher-${teacher.id}-delete-reason` : undefined
                      }
                      className={hasCourses ? 'opacity-50' : undefined}
                      onClick={async () => {
                        if (hasCourses) return
                        if (!confirm(t('teachers.detail.deleteConfirm'))) return
                        try {
                          await deleteTeacher.mutateAsync(teacher.id)
                        } catch (err) {
                          alert((err as Error).message)
                        }
                      }}
                    >
                      {t('common.actions.delete')}
                    </Button>
                    {hasCourses && (
                      <span id={`teacher-${teacher.id}-delete-reason`} className="sr-only">
                        {t('teachers.detail.sections.courses')}
                      </span>
                    )}
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
