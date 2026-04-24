import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { useDeleteStudent, useStudents } from '@/hooks/api'
import type { StudentFilters } from '@/data/api/students'
import { EDUCATIONAL_LEVELS, PROVINCES } from '@/constants/student'

export function StudentsListPage() {
  const { t } = useTranslation()
  const [filters, setFilters] = useState<StudentFilters>({})
  const { data = [], isLoading } = useStudents(filters)
  const deleteStudent = useDeleteStudent()
  const navigate = useNavigate()

  const hasFilters = Boolean(filters.search || filters.province || filters.educationalLevel)

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('students.list.title')}
        description={t('students.list.subtitle')}
        action={
          <Button onClick={() => navigate('/app/students/new')}>
            {t('students.list.addButton')}
          </Button>
        }
      />

      <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder={t('students.list.searchPlaceholder')}
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
        />
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
        <p className="text-sm text-muted-foreground">…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? t('students.list.emptyFiltered') : t('students.list.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('students.list.columns.name')}</TableHead>
              <TableHead>{t('students.list.columns.email')}</TableHead>
              <TableHead>{t('students.list.columns.province')}</TableHead>
              <TableHead>{t('students.list.columns.level')}</TableHead>
              <TableHead className="text-right">{t('students.list.columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link to={`/app/students/${s.id}`} className="hover:underline">
                    {s.firstName} {s.lastName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                <TableCell>{s.province}</TableCell>
                <TableCell>{t(`students.form.level.${s.educationalLevel}`)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/app/students/${s.id}/edit`)}
                  >
                    {t('students.detail.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(t('students.detail.deleteConfirm'))) {
                        deleteStudent.mutate(s.id)
                      }
                    }}
                  >
                    {t('common.actions.delete')}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
