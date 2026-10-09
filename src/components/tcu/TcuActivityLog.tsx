import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { DataTable, DataTableCard, type DataTableColumn } from '@/components/ui/data-table'
import { useFormat } from '@/hooks/useFormat'
import { newestFirst } from '@/lib/tcuActivityOrder'
import { TCU_VARIANT } from '@/lib/statusVariant'
import type { TcuActivity } from '@/types'

/**
 * One trainee's activity log — Activity · Hours · Date · Status, newest first,
 * paginated — shared by the volunteer's dashboard and the admin's TCU page once
 * a trainee is selected. Every row is the same trainee's, so there is no Trainee
 * column to repeat it.
 */
export function TcuActivityLog({ activities }: { activities: TcuActivity[] }) {
  const { t } = useTranslation()
  const { formatDate, formatNumber } = useFormat()

  const columns: DataTableColumn<TcuActivity>[] = [
    { id: 'title', header: t('tcu.list.columns.title'), cell: (a) => a.title },
    {
      id: 'hours',
      header: t('tcu.list.columns.hours'),
      align: 'right',
      className: 'font-mono tabular-nums',
      cell: (a) => formatNumber(a.hours),
    },
    { id: 'date', header: t('tcu.list.columns.date'), cell: (a) => formatDate(a.date) },
    {
      id: 'status',
      header: t('tcu.list.columns.status'),
      cell: (a) => (
        <Badge variant={TCU_VARIANT[a.status]}>{t(`tcu.list.status.${a.status}`)}</Badge>
      ),
    },
  ]

  return (
    <DataTable
      data={newestFirst(activities)}
      columns={columns}
      getRowKey={(a) => a.id}
      renderCard={(a) => <DataTableCard row={a} columns={columns} titleColumnId="title" />}
    />
  )
}
