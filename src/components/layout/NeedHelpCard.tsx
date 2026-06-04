import { LifeBuoy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

const REPO_URL = 'https://github.com/rjwrld/FundaVida'

export function NeedHelpCard() {
  const { t } = useTranslation()
  return (
    <div className="m-3 mt-auto rounded-lg border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-green-500/15 text-brand-green-700 dark:text-brand-green-300">
          <LifeBuoy className="size-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-tight text-foreground">
            {t('common.help.title')}
          </p>
          <p className="text-[13px] leading-snug text-muted-foreground">{t('common.help.body')}</p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex text-[13px] font-medium text-brand-green-700 transition-colors hover:text-brand-green-800 dark:text-brand-green-300 dark:hover:text-brand-green-200"
          >
            {t('common.help.cta')}
          </a>
        </div>
      </div>
    </div>
  )
}
