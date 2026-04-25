import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { FlameCelebration } from '@/components/icons/flame/FlameCelebration'
import { useFormat } from '@/hooks/useFormat'
import { cn } from '@/lib/utils'

export interface PendingApprovalsProps {
  count: number
}

export function PendingApprovals({ count }: PendingApprovalsProps) {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const hasPending = count > 0

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-xl border p-5 shadow-card',
        hasPending ? 'border-flame-yellow-400/40 bg-flame-yellow-50' : 'border-border bg-card'
      )}
    >
      <header className="mb-4 flex items-center justify-between">
        <h3
          className={cn(
            'font-display text-lg',
            hasPending ? 'text-flame-yellow-600' : 'text-foreground'
          )}
        >
          {t('dashboard.pendingApprovals.title')}
        </h3>
        {hasPending ? (
          <FlameCelebration size={28} aria-hidden="true" className="text-flame-yellow-500" />
        ) : (
          <CheckCircle2 className="size-5 text-brand-green-500" aria-hidden="true" />
        )}
      </header>
      {hasPending ? (
        <div className="flex flex-1 flex-col justify-between gap-4">
          <div>
            <p className="font-mono text-[40px] font-semibold tabular-nums leading-none text-flame-yellow-600">
              {formatNumber(count)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">
              {t('dashboard.pendingApprovals.description', { count })}
            </p>
          </div>
          <Link
            to="/app/certificates?status=pending"
            className="inline-flex w-fit items-center gap-1 rounded-md bg-flame-yellow-500 px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-flame-yellow-400"
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
