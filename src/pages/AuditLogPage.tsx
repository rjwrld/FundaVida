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
import { useAuditLog } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import type { AuditLogFilters } from '@/data/api/auditLog'
import type { AuditAction, AuditEntity } from '@/types'

const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'enroll', 'unenroll', 'grade']
const ENTITIES: AuditEntity[] = [
  'student',
  'teacher',
  'course',
  'enrollment',
  'grade',
  'emailCampaign',
]

export function AuditLogPage() {
  const { t } = useTranslation()
  const { formatDateTime } = useFormat()
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const { data = [], isLoading } = useAuditLog(filters)

  return (
    <div className="space-y-6">
      <PageHeader title={t('auditLog.title')} description={t('auditLog.subtitle')} />

      <section aria-label={t('common.a11y.filters')} className="grid gap-3 sm:grid-cols-2">
        <Select
          value={filters.action ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, action: v === 'any' ? undefined : (v as AuditAction) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('auditLog.columns.action')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('auditLog.filter.all')}</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {t(`auditLog.filter.${a}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.entity ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, entity: v === 'any' ? undefined : (v as AuditEntity) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={t('auditLog.columns.entity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('auditLog.filter.all')}</SelectItem>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>
                {t(`auditLog.entities.${e}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('courses.detail.loading')}</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('auditLog.emptyFiltered')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('auditLog.columns.timestamp')}</TableHead>
              <TableHead>{t('auditLog.columns.actor')}</TableHead>
              <TableHead>{t('auditLog.columns.action')}</TableHead>
              <TableHead>{t('auditLog.columns.entity')}</TableHead>
              <TableHead>{t('auditLog.columns.summary')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{formatDateTime(e.timestamp)}</TableCell>
                <TableCell>{e.actorId}</TableCell>
                <TableCell>{t(`auditLog.actions.${e.action}`)}</TableCell>
                <TableCell>{t(`auditLog.entities.${e.entity}`)}</TableCell>
                <TableCell>{e.summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
