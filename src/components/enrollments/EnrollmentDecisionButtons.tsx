import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { EnrollmentRow, useEnrollmentDecisions } from '@/hooks/useEnrollmentRequests'

/** Approve and Reject for one pending request; Approve explains itself at capacity. */
export function EnrollmentDecisionButtons({
  row,
  decisions,
}: {
  row: EnrollmentRow
  decisions: ReturnType<typeof useEnrollmentDecisions>
}) {
  const { t } = useTranslation()
  const { approve, reject } = decisions
  const approveButton = (
    <Button
      size="sm"
      variant="default"
      onClick={() => approve.mutate(row.id)}
      disabled={approve.isPending || row.isAtCapacity}
      aria-label={t('enrollments.list.approveAria', { student: row.studentName })}
      data-testid={`approve-${row.id}`}
    >
      {t('common.actions.approve')}
    </Button>
  )

  return (
    <div className="flex justify-end gap-2">
      {/* A disabled Button gets `pointer-events-none`, so it can never be a
          tooltip trigger itself — the at-capacity reason hangs off a focusable
          span wrapping it. Only the at-capacity row pays for that extra tab stop;
          every other row renders the bare Button. */}
      {row.isAtCapacity ? (
        <Tooltip>
          <TooltipTrigger asChild>
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <span tabIndex={0} data-testid={`approve-${row.id}-reason`}>
              {approveButton}
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('enrollments.approvalQueue.capacityReached')}</TooltipContent>
        </Tooltip>
      ) : (
        approveButton
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => reject.mutate(row.id)}
        disabled={reject.isPending}
        aria-label={t('enrollments.list.rejectAria', { student: row.studentName })}
        data-testid={`reject-${row.id}`}
      >
        {t('common.actions.reject')}
      </Button>
    </div>
  )
}
