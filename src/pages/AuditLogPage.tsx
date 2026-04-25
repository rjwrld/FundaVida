import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
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
import { AuditLogsEmpty } from '@/components/empty-states/AuditLogsEmpty'
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

function actionVariant(
  action: AuditAction
): 'success' | 'info' | 'destructive' | 'warning' | 'neutral' {
  if (action === 'create' || action === 'enroll') return 'success'
  if (action === 'update') return 'info'
  if (action === 'delete') return 'destructive'
  if (action === 'grade') return 'warning'
  return 'neutral'
}

export function AuditLogPage() {
  const { t } = useTranslation()
  const { formatDateTime } = useFormat()
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const { data = [], isLoading } = useAuditLog(filters)

  const hasFilters = Boolean(filters.action || filters.entity)
  const count = data.length

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
        <SkeletonTable rows={8} columns={5} />
      ) : count === 0 && !hasFilters ? (
        <AuditLogsEmpty />
      ) : count === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('auditLog.emptyFiltered')}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
          <div
            className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground"
            aria-hidden="true"
          >
            <span>{t('auditLog.title')}</span>
            <span className="font-mono normal-case tabular-nums text-foreground">{count}</span>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>{t('auditLog.columns.timestamp')}</TableHead>
                <TableHead>{t('auditLog.columns.actor')}</TableHead>
                <TableHead>{t('auditLog.columns.action')}</TableHead>
                <TableHead>{t('auditLog.columns.entity')}</TableHead>
                <TableHead>{t('auditLog.columns.summary')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((e) => (
                <TableRow key={e.id} className="h-12 hover:bg-muted/40">
                  <TableCell>{formatDateTime(e.timestamp)}</TableCell>
                  <TableCell>{e.actorId}</TableCell>
                  <TableCell>
                    <Badge variant={actionVariant(e.action)} dot>
                      {t(`auditLog.actions.${e.action}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{t(`auditLog.entities.${e.entity}`)}</Badge>
                  </TableCell>
                  <TableCell>{e.summary}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
