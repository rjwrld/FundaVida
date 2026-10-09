import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { NoResults } from '@/components/shared/NoResults'
import { PageHeader } from '@/components/shared/PageHeader'
import { SectionHeader } from '@/components/shared/SectionHeader'
import { useTcuActivities, useTcuTrainees } from '@/hooks/api'
import { resolveQueries } from '@/lib/resolveQueries'
import { fullName } from '@/lib/personName'
import { LogTcuActivityDialog } from '@/components/tcu/LogTcuActivityDialog'
import { TcuActivityLog } from '@/components/tcu/TcuActivityLog'
import { TcuApprovalQueue } from '@/components/tcu/TcuApprovalQueue'
import { TraineeProgressRoster } from '@/components/tcu/TraineeProgressRoster'

/**
 * The admin's TCU page (ADR-0051): the full approval queue — the dashboard's
 * {@link TcuApprovalQueue}, uncapped — then every trainee's progress. The roster
 * is the activity log's filter (#367): selecting a trainee opens their log below,
 * newest first and paginated; with no one selected there is no log to wade
 * through. A trainee's own home is their dashboard (ADR-0050), so the page is
 * the admin's alone.
 */
export function TcuListPage() {
  const { t } = useTranslation()
  const [selectedTraineeId, setSelectedTraineeId] = useState<string | null>(null)
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  // The log narrows the same scoped read the roster derives hours from, so
  // selecting a trainee never refetches; its heading names the trainee from the
  // second read, so both gate together (ADR-0030).
  const gate = resolveQueries([useTcuActivities({}), useTcuTrainees()])
  const [activities, trainees] = gate.isPending ? [[], []] : gate.data
  const selected = trainees.find((tr) => tr.id === selectedTraineeId) ?? null
  const selectedActivities = selected ? activities.filter((a) => a.traineeId === selected.id) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('tcu.list.title')}
        action={
          <Button variant="default" size="sm" onClick={() => setLogDialogOpen(true)}>
            {t('tcu.dialog.logActivityTitle')}
          </Button>
        }
      />

      <TcuApprovalQueue />

      <TraineeProgressRoster
        selectedTraineeId={selectedTraineeId}
        onSelect={(id) => setSelectedTraineeId((prev) => (prev === id ? null : id))}
      />

      {selected && (
        <section aria-labelledby="tcu-activity-log-heading" className="space-y-3">
          <SectionHeader
            id="tcu-activity-log-heading"
            title={t('tcu.list.logTitle', { name: fullName(selected) })}
            count={selectedActivities.length}
          />
          {selectedActivities.length === 0 ? (
            <NoResults message={t('tcu.list.empty')} />
          ) : (
            <TcuActivityLog activities={selectedActivities} />
          )}
        </section>
      )}

      <LogTcuActivityDialog open={logDialogOpen} onClose={() => setLogDialogOpen(false)} />
    </div>
  )
}
