import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { useFormat } from '@/hooks/useFormat'

export interface PendingApprovalsProps {
  count: number
}

export function PendingApprovals({ count }: PendingApprovalsProps) {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const hasPending = count > 0

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg text-foreground">
          {t('dashboard.pendingApprovals.title')}
        </h3>
        {hasPending ? (
          <Clock size={28} aria-hidden="true" className="text-muted-foreground" />
        ) : (
          <CheckCircle2 className="size-5 text-brand-green-500" aria-hidden="true" />
        )}
      </header>
      {hasPending ? (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <p className="font-mono text-[40px] font-semibold tabular-nums leading-none text-foreground">
              {formatNumber(count)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              {t('dashboard.pendingApprovals.description', { count })}
            </p>
          </div>
          <Link
            to="/app/certificates?status=pending"
            className="inline-flex w-fit items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('dashboard.pendingApprovals.cta')}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col justify-center gap-1.5">
          <p className="font-display text-2xl text-foreground">
            {t('dashboard.pendingApprovals.zero')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.pendingApprovals.zeroSubtitle')}
          </p>
        </div>
      )}
    </article>
  )
}
