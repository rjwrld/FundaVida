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

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('tcu.list.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('tcu.list.subtitle')}</p>
        <p className="text-sm text-muted-foreground">
          {t('tcu.list.totalLabel', { hours: formatNumber(totalHours) })}
        </p>
      </header>

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
        <p className="text-sm text-muted-foreground">…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('tcu.list.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tcu.list.columns.student')}</TableHead>
              <TableHead>{t('tcu.list.columns.description')}</TableHead>
              <TableHead>{t('tcu.list.columns.hours')}</TableHead>
              <TableHead>{t('tcu.list.columns.date')}</TableHead>
              <TableHead>{t('tcu.list.columns.organizer')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((a) => {
              const s = students.find((x) => x.id === a.studentId)
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    {s?.firstName} {s?.lastName}
                  </TableCell>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{formatNumber(a.hours)}</TableCell>
                  <TableCell>{formatDate(a.date)}</TableCell>
                  <TableCell>{a.organizerId ?? '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
