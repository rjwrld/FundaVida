import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoResults } from '@/components/shared/NoResults'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { CoursesEmpty } from '@/components/empty-states/CoursesEmpty'
import { CourseFormDialog } from '@/components/courses/CourseFormDialog'
import { CourseStateBadge } from '@/components/courses/CourseStateBadge'
import { useCourses, useDeleteCourse, usePublishCourse } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { can } from '@/permissions'
import { useFormDialogParams } from '@/hooks/useFormDialogParams'
import { SEDES } from '@/constants/sede'
import type { CourseFilters } from '@/data/api/courses'
import type { Course } from '@/types'
import { useStore } from '@/data/store'
import { shortCourseName } from '@/lib/courseName'

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
  const role = useStore((s) => s.role)
  const currentUserId = useStore((s) => s.currentUserId)
  const canCreate = useCan('create', 'courses')
  const canEdit = useCan('edit', 'courses')
  const canDelete = useCan('delete', 'courses')
  // A Teacher's edit/publish right is per-Course (courseOwned, ADR-0016), so it
  // must be evaluated against each Course — not the context-free page-level check
  // that only resolves for admin's blanket grant.
  const canEditCourse = (course: Course) =>
    role ? can(role, 'edit', 'courses', { course, userId: currentUserId ?? undefined }) : false
  const canActOnRows = canEdit || canDelete || data.some(canEditCourse)

  const hasFilters = Boolean(filters.search || filters.sede || filters.programId)
  const count = data.length
  const columnCount = canActOnRows ? 6 : 5

  const teacherName = (teacherId: string) => {
    const teacher = teachers.find((x) => x.id === teacherId)
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : teacherId
  }
  const programName = (programId: string) =>
    programs.find((p) => p.id === programId)?.name ?? programId

  const columns: DataTableColumn<Course>[] = [
    {
      id: 'name',
      header: t('courses.list.columns.name'),
      sortable: true,
      sortAccessor: (c) => c.name,
      cell: (c) => (
        <Link to={`/app/courses/${c.id}`} className="hover:underline">
          {shortCourseName(c)}
        </Link>
      ),
    },
    {
      id: 'program',
      header: t('courses.list.columns.program'),
      sortable: true,
      sortAccessor: (c) => programName(c.programId),
      cell: (c) => programName(c.programId),
    },
    {
      id: 'sede',
      header: t('courses.form.fields.sede'),
      sortable: true,
      sortAccessor: (c) => c.sede,
      cell: (c) => c.sede,
    },
    {
      id: 'teacher',
      header: t('courses.list.columns.teacher'),
      cell: (c) => teacherName(c.teacherId),
    },
    {
      id: 'status',
      header: t('courses.list.columns.status'),
      // The derived display state (ADR-0042), rendered through the one shared
      // badge. The testid stays keyed on the stored status so row-scoped test
      // hooks (e2e) keep resolving.
      cell: (c) => <CourseStateBadge course={c} data-testid={`course-status-${c.status}`} />,
    },
  ]
  if (canActOnRows) {
    columns.push({
      id: 'actions',
      header: t('courses.list.columns.actions'),
      align: 'right',
      cell: (c) => {
        const canPublish = canEditCourse(c) && c.status === 'draft'
        return (
          <RowActions
            editLabel={t('common.actions.editItem', { name: c.name })}
            deleteLabel={t('common.actions.deleteItem', { name: c.name })}
            publishLabel={t('courses.list.publishButton', { name: c.name })}
            onEdit={canEdit && c.status !== 'closed' ? () => openEdit(c.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(c) : undefined}
            onPublish={canPublish ? () => publishCourse.mutate({ courseId: c.id }) : undefined}
          />
        )
      },
    })
  }

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

      <ListView
        state={listViewState({ isLoading, count, hasFilters })}
        skeleton={<SkeletonTable rows={8} columns={columnCount} />}
        empty={<CoursesEmpty onAdd={canCreate ? openCreate : undefined} />}
        noResults={<NoResults message={t('courses.list.emptyFiltered')} />}
        content={
          <DataTable
            data={data}
            columns={columns}
            getRowKey={(c) => c.id}
            renderCard={(c) => (
              <DataTableCard
                row={c}
                columns={columns}
                titleColumnId="name"
                actionsColumnId="actions"
              />
            )}
          />
        }
      />

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
