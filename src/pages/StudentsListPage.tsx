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
import { StudentsEmpty } from '@/components/empty-states/StudentsEmpty'
import { StudentFormDialog } from '@/components/students/StudentFormDialog'
import { useDeleteStudent, useStudents } from '@/hooks/api'
import { useCan } from '@/hooks/useCan'
import { useFormDialogParams } from '@/hooks/useFormDialogParams'
import type { StudentFilters } from '@/data/api/students'
import type { Student } from '@/types'
import { EDUCATIONAL_LEVELS, PROVINCES } from '@/constants/student'

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

  const hasFilters = Boolean(filters.search || filters.province || filters.educationalLevel)
  const count = data.length

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
          value={filters.province ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, province: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('students.list.columns.province')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('students.list.columns.province')}</SelectItem>
            {PROVINCES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
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
          <SelectTrigger>
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

      {isLoading ? (
        <SkeletonTable rows={8} columns={5} />
      ) : count === 0 && !hasFilters ? (
        <StudentsEmpty onAdd={canCreate ? openCreate : undefined} />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('students.list.emptyFiltered')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('students.list.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>{t('students.list.columns.name')}</TableHead>
                <TableHead>{t('students.list.columns.email')}</TableHead>
                <TableHead>{t('students.list.columns.province')}</TableHead>
                <TableHead>{t('students.list.columns.level')}</TableHead>
                <TableHead className="text-right">{t('students.list.columns.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((s) => {
                const name = `${s.firstName} ${s.lastName}`
                return (
                  <TableRow key={s.id} className="h-12 hover:bg-muted/40">
                    <TableCell>
                      <Link to={`/app/students/${s.id}`} className="hover:underline">
                        {name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                    <TableCell>{s.province}</TableCell>
                    <TableCell>{t(`students.form.level.${s.educationalLevel}`)}</TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        editLabel={t('common.actions.editItem', { name })}
                        deleteLabel={t('common.actions.deleteItem', { name })}
                        onEdit={canEdit ? () => openEdit(s.id) : undefined}
                        onDelete={canDelete ? () => setPendingDelete(s) : undefined}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

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
