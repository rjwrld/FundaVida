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
import { StudentsEmpty } from '@/components/empty-states/StudentsEmpty'
import { StudentFormDialog } from '@/components/students/StudentFormDialog'
import { useDeleteStudent, useStudents } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useFormDialogParams } from '@/hooks/useFormDialogParams'
import type { StudentFilters } from '@/data/api/students'
import type { Student } from '@/types'
import { EDUCATIONAL_LEVELS } from '@/constants/student'
import { SEDES } from '@/constants/sede'

export function StudentsListPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<StudentFilters>({})
  const { data = [], isLoading } = useStudents(filters)
  const deleteStudent = useDeleteStudent()
  const { isOpen, mode, editId, openCreate, openEdit, close } = useFormDialogParams()
  const [pendingDelete, setPendingDelete] = useState<Student | null>(null)

  const canCreate = useCan('create', 'students')
  const canEdit = useCan('edit', 'students')
  const canDelete = useCan('delete', 'students')

  const hasFilters = Boolean(filters.search || filters.sede || filters.educationalLevel)
  const count = data.length

  const columns: DataTableColumn<Student>[] = [
    {
      id: 'name',
      header: t('students.list.columns.name'),
      sortable: true,
      sortAccessor: (s) => `${s.firstName} ${s.lastName}`,
      cell: (s) => (
        <Link to={`/app/students/${s.id}`} className="hover:underline">
          {`${s.firstName} ${s.lastName}`}
        </Link>
      ),
    },
    {
      id: 'email',
      header: t('students.list.columns.email'),
      cell: (s) => <span className="text-sm text-muted-foreground">{s.email}</span>,
    },
    {
      id: 'sede',
      header: t('students.list.columns.sede'),
      sortable: true,
      sortAccessor: (s) => s.sede,
      cell: (s) => s.sede,
    },
    {
      id: 'level',
      header: t('students.list.columns.level'),
      sortable: true,
      sortAccessor: (s) => t(`students.form.level.${s.educationalLevel}`),
      cell: (s) => t(`students.form.level.${s.educationalLevel}`),
    },
    {
      id: 'actions',
      header: t('students.list.columns.actions'),
      align: 'right',
      cell: (s) => {
        const name = `${s.firstName} ${s.lastName}`
        return (
          <RowActions
            editLabel={t('common.actions.editItem', { name })}
            deleteLabel={t('common.actions.deleteItem', { name })}
            onEdit={canEdit ? () => openEdit(s.id) : undefined}
            onDelete={canDelete ? () => setPendingDelete(s) : undefined}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('students.list.title')}
        description={t('students.list.subtitle')}
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              {t('students.list.addButton')}
            </Button>
          ) : undefined
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
            placeholder={t('students.list.searchPlaceholder')}
            value={filters.search ?? ''}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.sede ?? 'any'}
          onValueChange={(v) => setFilters((f) => ({ ...f, sede: v === 'any' ? undefined : v }))}
        >
          <SelectTrigger aria-label={t('students.list.columns.sede')}>
            <SelectValue placeholder={t('students.list.columns.sede')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('students.list.columns.sede')}</SelectItem>
            {SEDES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.educationalLevel ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, educationalLevel: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger aria-label={t('students.list.columns.level')}>
            <SelectValue placeholder={t('students.list.columns.level')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('students.list.columns.level')}</SelectItem>
            {EDUCATIONAL_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {t(`students.form.level.${l}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <ListView
        state={listViewState({ isLoading, count, hasFilters })}
        skeleton={<SkeletonTable rows={8} columns={5} />}
        empty={<StudentsEmpty onAdd={canCreate ? openCreate : undefined} />}
        noResults={<NoResults message={t('students.list.emptyFiltered')} />}
        content={
          <DataTable
            data={data}
            columns={columns}
            getRowKey={(s) => s.id}
            renderCard={(s) => (
              <DataTableCard
                row={s}
                columns={columns}
                titleColumnId="name"
                actionsColumnId="actions"
              />
            )}
          />
        }
      />

      <StudentFormDialog
        open={isOpen && (mode === 'edit' ? canEdit : canCreate)}
        mode={mode}
        studentId={editId}
        onClose={close}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('common.confirmDelete.title')}
        description={t('students.detail.deleteConfirm')}
        confirmLabel={t('common.actions.delete')}
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteStudent.mutate(pendingDelete.id)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
      />
    </div>
  )
}
