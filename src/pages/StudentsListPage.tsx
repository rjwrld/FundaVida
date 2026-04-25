import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PageHeader } from '@/components/shared/PageHeader'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { StudentsEmpty } from '@/components/empty-states/StudentsEmpty'
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
  const count = data.length

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('students.list.title')}
        description={t('students.list.subtitle')}
        action={
          <Button onClick={() => navigate('/app/students/new')}>
            <Plus size={16} className="mr-2" />
            {t('students.list.addButton')}
          </Button>
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
        <StudentsEmpty onAdd={() => navigate('/app/students/new')} />
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
              {data.map((s) => (
                <TableRow key={s.id} className="h-12 hover:bg-muted/40">
                  <TableCell>
                    <Link to={`/app/students/${s.id}`} className="hover:underline">
                      {s.firstName} {s.lastName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                  <TableCell>{s.province}</TableCell>
                  <TableCell>{t(`students.form.level.${s.educationalLevel}`)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={t('students.list.columns.actions')}
                        >
                          <MoreHorizontal size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => navigate(`/app/students/${s.id}/edit`)}>
                          {t('students.detail.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                          onSelect={() => {
                            if (confirm(t('students.detail.deleteConfirm'))) {
                              deleteStudent.mutate(s.id)
                            }
                          }}
                        >
                          {t('common.actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
