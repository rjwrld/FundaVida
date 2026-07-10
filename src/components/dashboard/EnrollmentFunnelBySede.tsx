import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Filter } from 'lucide-react'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { enrollmentFunnelBySede } from '@/lib/dashboard'
import { useEnrollments } from '@/hooks/api/enrollments'
import { useCourses } from '@/hooks/api/courses'

/**
 * The enrollment funnel — pending → approved — grouped by Sede (see
 * {@link enrollmentFunnelBySede}). Reads the role-scoped enrollments and courses
 * queries. Each Sede row shows a stacked bar (approved vs pending) and its
 * counts, and the card links onward to the enrollments worklist.
 */
export function EnrollmentFunnelBySede() {
  const { t } = useTranslation()
  const { data: enrollments = [] } = useEnrollments()
  const { data: courses = [] } = useCourses()

  const funnel = useMemo(() => enrollmentFunnelBySede(enrollments, courses), [enrollments, courses])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle as="h3">{t('dashboard.enrollmentFunnel.title')}</CardTitle>
        <CardAction>
          <Filter
            className="size-4 text-brand-green-700 dark:text-brand-green-300"
            aria-hidden="true"
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {funnel.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.enrollmentFunnel.empty')}</p>
        ) : (
          <ul className="flex flex-1 flex-col gap-4">
            {funnel.map(({ sede, pending, approved }) => {
              const total = pending + approved
              const approvedPct = total === 0 ? 0 : Math.round((approved / total) * 100)
              return (
                <li key={sede} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-foreground">{sede}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {t('dashboard.enrollmentFunnel.summary', { approved, pending })}
                    </span>
                  </div>
                  {/* Decorative: the approved/pending split is already announced
                      by the summary text above, so the bar is hidden from AT. */}
                  <div
                    className="flex h-2 overflow-hidden rounded-full bg-muted"
                    aria-hidden="true"
                  >
                    <div className="bg-brand-green-500" style={{ width: `${approvedPct}%` }} />
                    <div
                      className="bg-flame-yellow-400 dark:bg-flame-yellow-600"
                      style={{ width: `${100 - approvedPct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
      <CardFooter>
        <Link
          to="/app/enrollments"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-green-700 dark:text-brand-green-300 hover:underline"
        >
          {t('dashboard.enrollmentFunnel.viewAll')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}
