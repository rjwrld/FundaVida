import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { enrollmentFunnelBySede } from '@/lib/dashboard'
import { chartDrawIn } from '@/lib/motion'
import { resolveQueries } from '@/lib/resolveQueries'
import { useEnrollments } from '@/hooks/api/enrollments'
import { useCourses } from '@/hooks/api/courses'

/**
 * The enrollment funnel — pending → approved — grouped by Sede (see
 * {@link enrollmentFunnelBySede}), drawn as a stacked bar per Sede on the shadcn
 * Chart wrapper (ADR-0047 phase 5a). Reads the role-scoped enrollments and
 * courses queries behind {@link resolveQueries} (ADR-0030) so a default-`[]`
 * window never flashes the empty state. The card links onward to the
 * enrollments worklist.
 */
export function EnrollmentFunnelBySede() {
  const { t } = useTranslation()
  // Phase 6a chart draw-in: recharts animates outside framer's MotionConfig,
  // so the reduced-motion read is passed to each series explicitly.
  const drawIn = chartDrawIn(useReducedMotion())
  const enrollmentsQuery = useEnrollments()
  const coursesQuery = useCourses()
  const gate = resolveQueries([enrollmentsQuery, coursesQuery])

  if (gate.isPending) {
    return <SkeletonCard lines={4} />
  }

  const [enrollments, courses] = gate.data
  const funnel = enrollmentFunnelBySede(enrollments, courses)

  // Approved wears the chart ramp's lead green; pending is grey on purpose —
  // ADR-0047's status language is two-hue (success/destructive) plus greys.
  const chartConfig = {
    approved: { label: t('enrollments.status.approved'), color: 'var(--chart-1)' },
    pending: { label: t('enrollments.status.pending'), color: 'var(--muted-foreground)' },
  } satisfies ChartConfig

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle as="h3">{t('dashboard.enrollmentFunnel.title')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {funnel.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.enrollmentFunnel.empty')}</p>
        ) : (
          <>
            {/* Decorative: the approved/pending split per Sede is announced by
                the sr-only list below, so the chart is hidden from AT (and the
                recharts accessibility layer stays off — an aria-hidden subtree
                must not contain focusable elements). */}
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-56 w-full"
              aria-hidden="true"
            >
              <BarChart accessibilityLayer={false} data={funnel}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="sede" tickLine={false} tickMargin={10} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="approved"
                  stackId="funnel"
                  fill="var(--color-approved)"
                  radius={[0, 0, 4, 4]}
                  {...drawIn}
                />
                <Bar
                  dataKey="pending"
                  stackId="funnel"
                  fill="var(--color-pending)"
                  radius={[4, 4, 0, 0]}
                  {...drawIn}
                />
              </BarChart>
            </ChartContainer>
            <ul className="sr-only">
              {funnel.map(({ sede, pending, approved }) => (
                <li key={sede}>
                  <span>{sede}</span>{' '}
                  <span>{t('dashboard.enrollmentFunnel.summary', { approved, pending })}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
      <CardFooter>
        <Link
          to="/app/enrollments"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('dashboard.enrollmentFunnel.viewAll')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}
