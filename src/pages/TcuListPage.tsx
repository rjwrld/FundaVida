import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useTcuActivities } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import type { TcuFilters } from '@/data/api/tcu'

export function TcuListPage() {
  const { t } = useTranslation()
  const { formatDate, formatNumber } = useFormat()
  const role = useStore((s) => s.role)
  const [filters, setFilters] = useState<TcuFilters>({})
  const { data = [], isLoading } = useTcuActivities(filters)
  const students = useStore((s) => s.students)

  const totalHours = data.reduce((sum, a) => sum + a.hours, 0)
  const hasFilters = Boolean(filters.studentId || filters.organizerId)
  const count = data.length

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tcu.list.title')}
        description={t('tcu.list.subtitle')}
        action={
          <div
            className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
            aria-label={t('tcu.list.totalLabel', { hours: formatNumber(totalHours) })}
          >
            <span className="font-mono tabular-nums text-foreground">
              {formatNumber(totalHours)}
            </span>
            <span>{t('tcu.list.hoursUnit')}</span>
          </div>
        }
      />

      {role === 'admin' && (
        <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-2">
          <Select
            value={filters.studentId ?? 'any'}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, studentId: v === 'any' ? undefined : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('tcu.list.filters.studentPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('tcu.list.filters.anyStudent')}</SelectItem>
              {students.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.organizerId ?? 'any'}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, organizerId: v === 'any' ? undefined : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t('tcu.list.filters.organizerPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">{t('tcu.list.filters.anyOrganizer')}</SelectItem>
              <SelectItem value="tcu-1">TCU-1</SelectItem>
            </SelectContent>
          </Select>
        </section>
      )}

      {isLoading ? (
        <SkeletonTable rows={8} columns={5} />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {hasFilters ? t('tcu.list.emptyFiltered') : t('tcu.list.empty')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('tcu.list.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>{t('tcu.list.columns.student')}</TableHead>
                <TableHead>{t('tcu.list.columns.description')}</TableHead>
                <TableHead className="text-right font-mono tabular-nums">
                  {t('tcu.list.columns.hours')}
                </TableHead>
                <TableHead>{t('tcu.list.columns.date')}</TableHead>
                <TableHead>{t('tcu.list.columns.organizer')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((a) => {
                const s = students.find((x) => x.id === a.studentId)
                return (
                  <TableRow key={a.id} className="h-12 hover:bg-muted/40">
                    <TableCell>
                      {s?.firstName} {s?.lastName}
                    </TableCell>
                    <TableCell>{a.title}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {formatNumber(a.hours)}
                    </TableCell>
                    <TableCell>{formatDate(a.date)}</TableCell>
                    <TableCell>{a.organizerId ?? '—'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
