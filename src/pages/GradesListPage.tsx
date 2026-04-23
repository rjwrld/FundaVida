import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
import { EditGradeDialog } from '@/components/grades/EditGradeDialog'
import { useDeleteGrade, useGrades } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import type { GradeFilters } from '@/data/api/grades'

interface EditTarget {
  id: string
  initialScore: number
  studentName: string
  courseName: string
}

export function GradesListPage() {
  const { t } = useTranslation()
  const { formatDate, formatGrade } = useFormat()
  const [filters, setFilters] = useState<GradeFilters>({})
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const { data = [], isLoading } = useGrades(filters)
  const deleteGrade = useDeleteGrade()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)

  const hasFilters = Boolean(filters.studentId || filters.courseId)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('grades.list.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('grades.list.subtitle')}</p>
      </header>

      <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-2">
        <Select
          value={filters.studentId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, studentId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('grades.list.filters.studentPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('grades.list.filters.anyStudent')}</SelectItem>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.courseId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, courseId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? t('grades.list.emptyFiltered') : t('grades.list.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('grades.list.columns.student')}</TableHead>
              <TableHead>{t('grades.list.columns.course')}</TableHead>
              <TableHead>{t('grades.list.columns.score')}</TableHead>
              <TableHead>{t('grades.list.columns.updatedAt')}</TableHead>
              <TableHead className="text-right">{t('grades.list.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((g) => {
              const s = students.find((x) => x.id === g.studentId)
              const c = courses.find((x) => x.id === g.courseId)
              const studentName = `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim()
              const courseName = c?.name ?? ''
              return (
                <TableRow key={g.id}>
                  <TableCell>{studentName || '—'}</TableCell>
                  <TableCell>{courseName || '—'}</TableCell>
                  <TableCell>{formatGrade(g.score)}</TableCell>
                  <TableCell>{formatDate(g.issuedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditTarget({
                          id: g.id,
                          initialScore: g.score,
                          studentName,
                          courseName,
                        })
                      }
                    >
                      {t('grades.list.editButton')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(
                            t('grades.list.deleteConfirmWithNames', {
                              student: studentName,
                              course: courseName,
                            })
                          )
                        ) {
                          deleteGrade.mutate(g.id)
                        }
                      }}
                    >
                      {t('common.actions.delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <EditGradeDialog
        gradeId={editTarget?.id ?? null}
        initialScore={editTarget?.initialScore ?? 0}
        studentName={editTarget?.studentName ?? ''}
        courseName={editTarget?.courseName ?? ''}
        onClose={() => setEditTarget(null)}
      />
    </div>
  )
}
