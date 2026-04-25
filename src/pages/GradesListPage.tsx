import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditGradeDialog } from '@/components/grades/EditGradeDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
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
  const count = data.length

  return (
    <div className="space-y-6">
      <PageHeader title={t('grades.list.title')} description={t('grades.list.subtitle')} />

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
        <SkeletonTable rows={8} columns={5} />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? t('grades.list.emptyFiltered') : t('grades.list.empty')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('grades.list.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
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
                  <TableRow key={g.id} className="h-12 hover:bg-muted/40">
                    <TableCell>{studentName || '—'}</TableCell>
                    <TableCell>{courseName || '—'}</TableCell>
                    <TableCell>{formatGrade(g.score)}</TableCell>
                    <TableCell>{formatDate(g.issuedAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={t('common.actions.openMenu')}
                          >
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onSelect={() =>
                              setEditTarget({
                                id: g.id,
                                initialScore: g.score,
                                studentName,
                                courseName,
                              })
                            }
                          >
                            {t('grades.list.editButton')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onSelect={() => {
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
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
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
