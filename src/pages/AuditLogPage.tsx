import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { NoResults } from '@/components/shared/NoResults'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { PageHeader } from '@/components/shared/PageHeader'
import { ListView } from '@/components/shared/ListView'
import { listViewState } from '@/lib/listViewState'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { AuditLogsEmpty } from '@/components/empty-states/AuditLogsEmpty'
import { useAuditLog } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import type { AuditLogFilters } from '@/data/api/auditLog'
import type { AuditAction, AuditEntity, AuditLogEntry } from '@/types'

const ACTIONS: AuditAction[] = [
  'create',
  'update',
  'delete',
  'enroll',
  'unenroll',
  'grade',
  'approve',
]
const ENTITIES: AuditEntity[] = [
  'student',
  'teacher',
  'course',
  'enrollment',
  'grade',
  'certificate',
  'session',
  'emailCampaign',
]

function actionVariant(
  action: AuditAction
): 'success' | 'info' | 'destructive' | 'warning' | 'neutral' {
  if (action === 'create' || action === 'enroll' || action === 'approve') return 'success'
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

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      id: 'timestamp',
      header: t('auditLog.columns.timestamp'),
      sortable: true,
      sortAccessor: (e) => e.timestamp,
      cell: (e) => formatDateTime(e.timestamp),
    },
    {
      id: 'actor',
      header: t('auditLog.columns.actor'),
      cell: (e) => e.actorId,
    },
    {
      id: 'action',
      header: t('auditLog.columns.action'),
      cell: (e) => (
        <Badge variant={actionVariant(e.action)}>{t(`auditLog.actions.${e.action}`)}</Badge>
      ),
    },
    {
      id: 'entity',
      header: t('auditLog.columns.entity'),
      // `outline`, not a status variant: the entity is a category chip, and a
      // status dot in front of it would signal a state it does not have.
      cell: (e) => <Badge variant="outline">{t(`auditLog.entities.${e.entity}`)}</Badge>,
    },
    {
      id: 'summary',
      header: t('auditLog.columns.summary'),
      cell: (e) => e.summary,
    },
  ]

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
          <SelectTrigger aria-label={t('auditLog.columns.action')}>
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
          <SelectTrigger aria-label={t('auditLog.columns.entity')}>
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

      <ListView
        state={listViewState({ isLoading, count, hasFilters })}
        skeleton={<SkeletonTable rows={8} columns={5} />}
        empty={<AuditLogsEmpty />}
        noResults={<NoResults message={t('auditLog.list.emptyFiltered')} />}
        content={
          <DataTable
            data={data}
            columns={columns}
            getRowKey={(e) => e.id}
            renderCard={(e) => <DataTableCard row={e} columns={columns} titleColumnId="summary" />}
          />
        }
      />
    </div>
  )
}
