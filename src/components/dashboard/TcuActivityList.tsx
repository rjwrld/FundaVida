import { useTranslation } from 'react-i18next'
import { formatDistance, parseISO } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clock } from '@/lib/clock'
import { useFormat } from '@/hooks/useFormat'
import type { TcuActivity } from '@/types'

export interface TcuActivityListProps {
  activities: TcuActivity[]
  limit?: number
}

/**
 * Renders a list of the trainee's recent TCU activities instead of just a count.
 */
export function TcuActivityList({ activities, limit = 5 }: TcuActivityListProps) {
  const { t } = useTranslation()
  const { locale } = useFormat()
  const dfLocale = locale === 'es' ? es : enUS

  const recentActivities = activities.slice(0, limit)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle as="h3" className="flex items-center gap-2">
          <Activity className="size-4 text-primary" aria-hidden="true" />
          {t('dashboard.tcu.recentActivitiesList')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {recentActivities.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.tcu.noActivities')}</p>
        ) : (
          <ul className="flex flex-1 flex-col divide-y divide-border/60">
            {recentActivities.map((activity) => {
              const when = formatDistance(parseISO(activity.date), clock.now(), {
                addSuffix: true,
                locale: dfLocale,
              })
              return (
                <li key={activity.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="flex gap-2 text-xs text-muted-foreground">
                      <span>{activity.hours}h</span>
                      <span>•</span>
                      <span>{when}</span>
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
