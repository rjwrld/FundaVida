import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NoResults } from '@/components/shared/NoResults'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { fullName } from '@/lib/personName'
import { ListHeaderBand } from '@/components/shared/ListHeaderBand'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { TeachersEmpty } from '@/components/empty-states/TeachersEmpty'
import { TeacherFormDialog } from '@/components/teachers/TeacherFormDialog'
import { useDeleteTeacher, useTeachers } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useFormDialogParams } from '@/hooks/useFormDialogParams'
import type { TeacherFilters } from '@/data/api/teachers'
import type { Teacher } from '@/types'

export function TeachersListPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<TeacherFilters>({})
  const { data = [], isLoading } = useTeachers(filters)
  const deleteTeacher = useDeleteTeacher()
  const { isOpen, mode, editId, openCreate, openEdit, close } = useFormDialogParams()
  const [pendingDelete, setPendingDelete] = useState<Teacher | null>(null)

  const canCreate = useCan('create', 'teachers')
  const canEdit = useCan('edit', 'teachers')
  const canDelete = useCan('delete', 'teachers')

  const hasFilters = Boolean(filters.search)
  const count = data.length

  function requestDelete(teacher: Teacher) {
    if (teacher.courseIds.length > 0) {
      toast.error(t('teachers.detail.cannotDeleteWithCourses', { count: teacher.courseIds.length }))
      return
    }
    setPendingDelete(teacher)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('teachers.list.title')}
        description={t('teachers.list.subtitle')}
        action={
          canCreate ? (
            <Button onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              {t('teachers.list.addButton')}
            </Button>
          ) : undefined
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

      <ListView
        state={listViewState({ isLoading, count, hasFilters })}
        skeleton={<SkeletonTable rows={8} columns={4} />}
        empty={<TeachersEmpty onAdd={canCreate ? openCreate : undefined} />}
        noResults={<NoResults message={t('teachers.list.emptyFiltered')} />}
        content={
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <ListHeaderBand label={t('teachers.list.title')} count={count} />
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
                  const name = fullName(teacher)
                  return (
                    <TableRow key={teacher.id} className="h-12 hover:bg-muted/40">
                      <TableCell>
                        <Link to={`/app/teachers/${teacher.id}`} className="hover:underline">
                          {name}
                        </Link>
                      </TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {teacher.courseIds.length}
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          editLabel={t('common.actions.editItem', { name })}
                          deleteLabel={t('common.actions.deleteItem', { name })}
                          onEdit={canEdit ? () => openEdit(teacher.id) : undefined}
                          onDelete={canDelete ? () => requestDelete(teacher) : undefined}
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        }
      />

      <TeacherFormDialog
        open={isOpen && (mode === 'edit' ? canEdit : canCreate)}
        mode={mode}
        teacherId={editId}
        onClose={close}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('common.confirmDelete.title')}
        description={t('teachers.detail.deleteConfirm')}
        confirmLabel={t('common.actions.delete')}
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteTeacher.mutate(pendingDelete.id)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
      />
    </div>
  )
}
