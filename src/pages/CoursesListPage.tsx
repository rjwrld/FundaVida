import { useState } from 'react'
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
import { useDataTableSurface } from '@/hooks/useDataTableSurface'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { isLiveCohort } from '@/lib/courseDisplayState'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { CoursesEmpty } from '@/components/empty-states/CoursesEmpty'
import { CourseFormDialog } from '@/components/courses/CourseFormDialog'
import { CourseStateBadge } from '@/components/courses/CourseStateBadge'
import { CourseTitleLink } from '@/components/courses/CourseTitleLink'
import { useCourses, useDeleteCourse, usePublishCourse } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { can, scopeFor } from '@/permissions'
import { useFormDialogParams } from '@/hooks/useFormDialogParams'
import { SEDES } from '@/constants/sede'
import type { CourseFilters } from '@/data/api/courses'
import type { Course } from '@/types'
import { useStore } from '@/data/store'
import { fullName } from '@/lib/personName'

export function CoursesListPage() {
  const { t } = useTranslation()
  const surface = useDataTableSurface()
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
  const canDelete = useCan('delete', 'courses')
  // A teacher's 'own' Courses all name them as Teacher and sit at their one Sede
  // (ADR-0011), so the scope token alone fixes both columns and the Campus filter
  // (ADR-0051) — never a guess from the rows on screen.
  const ownCourses = role ? scopeFor(role).courses === 'own' : false
  // A Teacher's edit/publish right is per-Course (courseOwned, ADR-0016), so it
  // must be evaluated against each Course — not the context-free page-level check
  // that only resolves for admin's blanket grant.
  const canEditCourse = (course: Course) =>
    role ? can(role, 'edit', 'courses', { course, userId: currentUserId ?? undefined }) : false
  // Edit is offered on a live cohort only (a closed one is terminal, ADR-0024);
  // Publish only on a draft. The column shows when at least one row has an action.
  const rowCanEdit = (course: Course) => canEditCourse(course) && isLiveCohort(course)
  const rowCanPublish = (course: Course) => canEditCourse(course) && course.status === 'draft'
  const canActOnRows = canDelete || data.some((c) => rowCanEdit(c) || rowCanPublish(c))
  // The form opens for the Course in the ?edit= param only when its row offers
  // Edit, for every role: a Teacher's own live Course opens, while anyone else's
  // Course or a closed (terminal, ADR-0024) one no-ops — admin included.
  const editCourse = editId ? data.find((c) => c.id === editId) : undefined
  const canOpenEdit = editCourse ? rowCanEdit(editCourse) : false

  const hasFilters = Boolean(filters.search || filters.sede || filters.programId)
  const count = data.length
  const columnCount = (canActOnRows ? 1 : 0) + (ownCourses ? 2 : 4)

  const teacherName = (teacherId: string) => {
    const teacher = teachers.find((x) => x.id === teacherId)
    return teacher ? fullName(teacher) : teacherId
  }
  const columns: DataTableColumn<Course>[] = [
    {
      id: 'name',
      header: t('courses.list.columns.name'),
      sortable: true,
      sortAccessor: (c) => c.name,
      cell: (c) => <CourseTitleLink course={c} shared={surface === 'table'} />,
    },
    // No Program column: the course name already leads with it (the filter stays).
    ...(ownCourses
      ? []
      : [
          {
            id: 'sede',
            header: t('courses.form.fields.sede'),
            sortable: true,
            sortAccessor: (c: Course) => c.sede,
            cell: (c: Course) => c.sede,
          },
          {
            id: 'teacher',
            header: t('courses.list.columns.teacher'),
            cell: (c: Course) => teacherName(c.teacherId),
          },
        ]),
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
        return (
          <RowActions
            editLabel={t('common.actions.editItem', { name: c.name })}
            deleteLabel={t('common.actions.deleteItem', { name: c.name })}
            publishLabel={t('courses.list.publishButton', { name: c.name })}
            onEdit={rowCanEdit(c) ? () => openEdit(c.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(c) : undefined}
            onPublish={
              rowCanPublish(c) ? () => publishCourse.mutate({ courseId: c.id }) : undefined
            }
          />
        )
      },
    })
  }

  // The stacked-card render of the same rows (below `sm`). It differs in exactly
  // one cell: the shared element the title link registers for the course→detail
  // morph belongs to whichever of the two renders the viewport is actually showing,
  // and only one node per Course may claim it (see `useDataTableSurface`).
  const cardColumns: DataTableColumn<Course>[] = columns.map((column) =>
    column.id === 'name'
      ? {
          ...column,
          cell: (c: Course) => <CourseTitleLink course={c} shared={surface === 'card'} />,
        }
      : column
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('courses.list.title')}
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              {t('courses.list.addButton')}
            </Button>
          ) : null
        }
      />

      <section aria-label={t('common.a11y.filters')} className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
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
        {!ownCourses && (
          <Select
            value={filters.sede ?? 'any'}
            onValueChange={(v) => setFilters((f) => ({ ...f, sede: v === 'any' ? undefined : v }))}
          >
            <SelectTrigger className="w-40" aria-label={t('courses.form.fields.sede')}>
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
        )}
        <Select
          value={filters.programId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, programId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger className="w-44" aria-label={t('courses.list.columns.program')}>
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
                columns={cardColumns}
                titleColumnId="name"
                actionsColumnId="actions"
              />
            )}
          />
        }
      />

      <CourseFormDialog
        open={isOpen && (mode === 'edit' ? canOpenEdit : canCreate)}
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
