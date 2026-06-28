import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
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
import { PageHeader } from '@/components/shared/PageHeader'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { CoursesEmpty } from '@/components/empty-states/CoursesEmpty'
import { CourseFormDialog } from '@/components/courses/CourseFormDialog'
import { useCourses, useDeleteCourse, usePublishCourse } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useFormDialogParams } from '@/hooks/useFormDialogParams'
import { SEDES } from '@/constants/sede'
import type { CourseFilters } from '@/data/api/courses'
import type { Course } from '@/types'
import { useStore } from '@/data/store'

export function CoursesListPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<CourseFilters>({})
  const { data = [], isLoading } = useCourses(filters)
  const deleteCourse = useDeleteCourse()
  const publishCourse = usePublishCourse()
  const { isOpen, mode, editId, openCreate, openEdit, close } = useFormDialogParams()
  const [pendingDelete, setPendingDelete] = useState<Course | null>(null)
  const teachers = useStore((s) => s.teachers)
  const programs = useStore((s) => s.programs)
  const canCreate = useCan('create', 'courses')
  const canEdit = useCan('edit', 'courses')
  const canDelete = useCan('delete', 'courses')
  const canActOnRows = canEdit || canDelete

  const hasFilters = Boolean(filters.search || filters.sede || filters.programId)
  const count = data.length
  const columnCount = canActOnRows ? 6 : 5

  const teacherName = (teacherId: string) => {
    const teacher = teachers.find((x) => x.id === teacherId)
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : teacherId
  }
  const programName = (programId: string) =>
    programs.find((p) => p.id === programId)?.name ?? programId

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('courses.list.title')}
        description={t('courses.list.subtitle')}
        action={
          canCreate ? (
            <Button onClick={openCreate}>
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
          value={filters.sede ?? 'any'}
          onValueChange={(v) => setFilters((f) => ({ ...f, sede: v === 'any' ? undefined : v }))}
        >
          <SelectTrigger aria-label={t('courses.form.fields.sede')}>
            <SelectValue placeholder={t('courses.form.fields.sede')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('courses.form.fields.sede')}</SelectItem>
            {SEDES.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.programId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, programId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger aria-label={t('courses.list.columns.program')}>
            <SelectValue placeholder={t('courses.list.columns.program')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('courses.list.columns.program')}</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <SkeletonTable rows={8} columns={columnCount} />
      ) : count === 0 && !hasFilters ? (
        <CoursesEmpty onAdd={canCreate ? openCreate : undefined} />
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
                <TableHead>{t('courses.form.fields.sede')}</TableHead>
                <TableHead>{t('courses.list.columns.teacher')}</TableHead>
                <TableHead>{t('courses.list.columns.status')}</TableHead>
                {canActOnRows && (
                  <TableHead className="text-right">{t('courses.list.columns.actions')}</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((c) => {
                const canPublish = canEdit && c.status === 'draft'
                return (
                  <TableRow key={c.id} className="h-12 hover:bg-muted/40">
                    <TableCell>
                      <Link to={`/app/courses/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>{programName(c.programId)}</TableCell>
                    <TableCell>{c.sede}</TableCell>
                    <TableCell>{teacherName(c.teacherId)}</TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded ${
                          c.status === 'published'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                        data-testid={`course-status-${c.status}`}
                      >
                        {t(`courses.status.${c.status}`)}
                      </span>
                    </TableCell>
                    {canActOnRows && (
                      <TableCell className="text-right">
                        <RowActions
                          editLabel={t('common.actions.editItem', { name: c.name })}
                          deleteLabel={t('common.actions.deleteItem', { name: c.name })}
                          publishLabel={t('courses.list.publishButton', { name: c.name })}
                          onEdit={canEdit ? () => openEdit(c.id) : undefined}
                          onDelete={canDelete ? () => setPendingDelete(c) : undefined}
                          onPublish={
                            canPublish
                              ? () => {
                                  publishCourse.mutate({ courseId: c.id })
                                }
                              : undefined
                          }
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

      <CourseFormDialog
        open={isOpen && (mode === 'edit' ? canEdit : canCreate)}
        mode={mode}
        courseId={editId}
        onClose={close}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('common.confirmDelete.title')}
        description={t('courses.detail.deleteConfirm')}
        confirmLabel={t('common.actions.delete')}
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteCourse.mutate(pendingDelete.id)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
      />
    </div>
  )
}
