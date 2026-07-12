import { LifeBuoy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const REPO_URL = 'https://github.com/rjwrld/FundaVida'

export function NeedHelpCard({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <Card className={cn('m-3 mt-auto', className)}>
      <CardContent className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
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
            className="mt-1 inline-flex text-[13px] font-medium text-primary transition-colors hover:text-primary/80"
          >
            {t('common.help.cta')}
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
