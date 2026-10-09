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
import { AUDIT_ACTION_VARIANT } from '@/lib/statusVariant'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { AuditLogsEmpty } from '@/components/empty-states/AuditLogsEmpty'
import { useAuditLog, useStudents, useTcuTrainees, useTeachers } from '@/hooks/api'
import { fullName } from '@/lib/personName'
import { useFormat } from '@/hooks/useFormat'
import type { AuditLogFilters } from '@/data/api/auditLog'
import type { AuditAction, AuditEntity, AuditLogEntry } from '@/types'

// Every AuditAction the store can emit, so the filter can reach every row the
// log can actually contain (#345). Ordered as the enum declares them.
const ACTIONS: AuditAction[] = [
  'create',
  'update',
  'delete',
  'enroll',
  'requestEnroll',
  'unenroll',
  'withdraw',
  'grade',
  'approve',
  'close',
  'log',
]
// Likewise every AuditEntity: `announcement`, `attendance` and `tcuActivity` are
// all written to the log but were absent here, so their rows could not be
// filtered to at all (#345).
const ENTITIES: AuditEntity[] = [
  'student',
  'teacher',
  'course',
  'enrollment',
  'grade',
  'certificate',
  'attendance',
  'session',
  'announcement',
  'emailCampaign',
  'tcuActivity',
]

export function AuditLogPage() {
  const { t } = useTranslation()
  const { formatDate, formatDateTime } = useFormat()
  const { data: students } = useStudents()
  const { data: teachers } = useTeachers()
  const { data: trainees } = useTcuTrainees()

  // Actors are user ids; show the person (or the role, for admin) instead.
  const actorName = (id: string) => {
    if (id === 'admin') return t('roles.admin.label')
    const person =
      teachers?.find((p) => p.id === id) ??
      students?.find((p) => p.id === id) ??
      trainees?.find((p) => p.id === id)
    return person ? fullName(person) : id
  }

  // Entries carry an i18n key plus name-snapshotted params; enum and date
  // params are localized here. Entries written before keys existed fall back
  // to their stored English summary.
  const summaryText = (e: AuditLogEntry) => {
    if (!e.summaryKey) return e.summary
    const params: Record<string, string | number> = { ...e.summaryParams }
    if (typeof params.status === 'string') {
      params.status = t(`attendance.list.status.${params.status}`).toLowerCase()
    }
    if (typeof params.date === 'string') params.date = formatDate(params.date)
    return t(e.summaryKey, params)
  }
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
      cell: (e) => actorName(e.actorId),
    },
    {
      id: 'action',
      header: t('auditLog.columns.action'),
      cell: (e) => (
        <Badge variant={AUDIT_ACTION_VARIANT[e.action]}>{t(`auditLog.actions.${e.action}`)}</Badge>
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
      cell: (e) => summaryText(e),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t('auditLog.title')} />

      <section aria-label={t('common.a11y.filters')} className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.action ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, action: v === 'any' ? undefined : (v as AuditAction) }))
          }
        >
          <SelectTrigger className="w-44" aria-label={t('auditLog.columns.action')}>
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
          <SelectTrigger className="w-44" aria-label={t('auditLog.columns.entity')}>
            <SelectValue placeholder={t('auditLog.columns.entity')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">{t('auditLog.filter.allEntities')}</SelectItem>
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
