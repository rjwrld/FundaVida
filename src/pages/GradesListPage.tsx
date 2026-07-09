import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NoResults } from '@/components/shared/NoResults'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { EditGradeDialog } from '@/components/grades/EditGradeDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { fullName } from '@/lib/personName'
import { RowActions } from '@/components/shared/RowActions'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { GradesEmpty } from '@/components/empty-states/GradesEmpty'
import { useCourses, useDeleteGrade, useGrades, useStudents } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import type { GradeFilters } from '@/data/api/grades'
import type { Grade } from '@/types'

interface EditTarget {
  id: string
  initialScore: number
  studentName: string
  courseName: string
}

interface DeleteTarget {
  id: string
  studentName: string
  courseName: string
}

export function GradesListPage() {
  const { t } = useTranslation()
  const { formatDate, formatGrade } = useFormat()
  const [filters, setFilters] = useState<GradeFilters>({})
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const { data = [], isLoading } = useGrades(filters)
  const deleteGrade = useDeleteGrade()
  const { data: students = [] } = useStudents()
  const { data: courses = [] } = useCourses()

  const hasFilters = Boolean(filters.studentId || filters.courseId)
  const count = data.length

  const rowInfo = (g: Grade) => {
    const s = students.find((x) => x.id === g.studentId)
    const c = courses.find((x) => x.id === g.courseId)
    const studentName = s ? fullName(s) : ''
    const courseName = c?.name ?? ''
    const label = [studentName, courseName].filter(Boolean).join(' — ') || '—'
    return { studentName, courseName, label }
  }

  const columns: DataTableColumn<Grade>[] = [
    {
      id: 'student',
      header: t('grades.list.columns.student'),
      sortable: true,
      sortAccessor: (g) => rowInfo(g).studentName,
      cell: (g) => rowInfo(g).studentName || '—',
    },
    {
      id: 'course',
      header: t('grades.list.columns.course'),
      sortable: true,
      sortAccessor: (g) => rowInfo(g).courseName,
      cell: (g) => rowInfo(g).courseName || '—',
    },
    {
      id: 'score',
      header: t('grades.list.columns.score'),
      sortable: true,
      sortAccessor: (g) => g.score,
      cell: (g) => formatGrade(g.score),
    },
    {
      id: 'updatedAt',
      header: t('grades.list.columns.updatedAt'),
      sortable: true,
      sortAccessor: (g) => g.issuedAt,
      cell: (g) => formatDate(g.issuedAt),
    },
    {
      id: 'actions',
      header: t('grades.list.columns.actions'),
      align: 'right',
      cell: (g) => {
        const { studentName, courseName, label } = rowInfo(g)
        return (
          <RowActions
            editLabel={t('common.actions.editItem', { name: label })}
            deleteLabel={t('common.actions.deleteItem', { name: label })}
            onEdit={() =>
              setEditTarget({ id: g.id, initialScore: g.score, studentName, courseName })
            }
            onDelete={() => setDeleteTarget({ id: g.id, studentName, courseName })}
          />
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t('grades.list.title')} description={t('grades.list.subtitle')} />

      <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-2">
        {students.length > 0 && (
          <Select
            value={filters.studentId ?? 'any'}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, studentId: v === 'any' ? undefined : v }))
            }
          >
            <SelectTrigger aria-label={t('grades.list.filters.studentPlaceholder')}>
              <SelectValue placeholder={t('grades.list.filters.studentPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('grades.list.filters.anyStudent')}</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {fullName(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select
          value={filters.courseId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, courseId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger aria-label={t('grades.list.filters.coursePlaceholder')}>
            <SelectValue placeholder={t('grades.list.filters.coursePlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('grades.list.filters.anyCourse')}</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      <ListView
        state={listViewState({ isLoading, count, hasFilters })}
        skeleton={<SkeletonTable rows={8} columns={5} />}
        empty={<GradesEmpty />}
        noResults={<NoResults message={t('grades.list.emptyFiltered')} />}
        content={
          <DataTable
            data={data}
            columns={columns}
            getRowKey={(g) => g.id}
            renderCard={(g) => (
              <DataTableCard
                row={g}
                columns={columns}
                titleColumnId="student"
                actionsColumnId="actions"
              />
            )}
          />
        }
      />

      <EditGradeDialog
        gradeId={editTarget?.id ?? null}
        initialScore={editTarget?.initialScore ?? 0}
        studentName={editTarget?.studentName ?? ''}
        courseName={editTarget?.courseName ?? ''}
        onClose={() => setEditTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('common.confirmDelete.title')}
        description={
          deleteTarget
            ? t('grades.list.deleteConfirmWithNames', {
                student: deleteTarget.studentName,
                course: deleteTarget.courseName,
              })
            : undefined
        }
        confirmLabel={t('common.actions.delete')}
        destructive
        onConfirm={() => {
          if (deleteTarget) deleteGrade.mutate(deleteTarget.id)
        }}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null)
        }}
      />
    </div>
  )
}
