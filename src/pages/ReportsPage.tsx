import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowDownRight, ArrowUpRight, CalendarDays } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import { UpcomingList } from '@/components/shared/UpcomingList'
import { ReportsEmpty } from '@/components/empty-states/ReportsEmpty'
import { useReportsData } from '@/hooks/api/useReportsData'
import { useFormat } from '@/hooks/useFormat'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { EnrollmentTrendChart } from '@/components/reports/EnrollmentTrendChart'
import { AttendanceHeatmap } from '@/components/reports/AttendanceHeatmap'
import { AverageGradeDonut } from '@/components/reports/AverageGradeDonut'
import { TcuProgressRing } from '@/components/reports/TcuProgressRing'
import { TopCoursesBar } from '@/components/reports/TopCoursesBar'

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}

export function ReportsPage() {
  const { t } = useTranslation()
  const { formatNumber } = useFormat()
  const data = useReportsData()

  if (!data.hasData) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow={t('nav.sections.reports')}
          title={t('reports.title')}
          description={t('reports.subtitle')}
        />
        <ReportsEmpty />
      </div>
    )
  }

  const deltaPositive = data.certsDelta >= 0
  const DeltaIcon = deltaPositive ? ArrowUpRight : ArrowDownRight

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('nav.sections.reports')}
        title={t('reports.title')}
        description={t('reports.subtitle')}
      />

      <motion.section
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12 lg:auto-rows-[minmax(160px,auto)]"
      >
        {/* Row 1 — hero charts */}
        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="md:col-span-6 lg:col-span-8 lg:row-span-2"
        >
          <Card className="h-full overflow-hidden border-border/60 shadow-card">
            <CardHeader className="flex flex-row items-baseline justify-between gap-3 pb-3">
              <CardTitle className="font-display text-xl font-normal text-foreground">
                {t('reports.enrollmentTrend.title')}
              </CardTitle>
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-brand-green-500" />
                  {t('reports.enrollmentTrend.currentYear')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-0.5 w-3 rounded-full border-t border-dashed border-muted-foreground"
                  />
                  {t('reports.enrollmentTrend.priorYear')}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <EnrollmentTrendChart data={data.enrollmentTrend} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="md:col-span-6 lg:col-span-4 lg:row-span-2"
        >
          <Card className="h-full border-border/60 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-xl font-normal text-foreground">
                {t('reports.attendanceHeatmap.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-72px)]">
              <AttendanceHeatmap data={data.attendance} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 2 — supporting metrics */}
        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="md:col-span-3 lg:col-span-3"
        >
          <Card className="h-full border-border/60 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-normal text-muted-foreground">
                {t('reports.averageGrade.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <AverageGradeDonut average={data.averageGrade} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="md:col-span-3 lg:col-span-3"
        >
          <Card className="h-full border-border/60 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-normal text-muted-foreground">
                {t('reports.tcuProgress.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <TcuProgressRing completed={data.tcuCompleted} target={data.tcuTarget} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="md:col-span-6 lg:col-span-6"
        >
          <Card className="h-full overflow-hidden border-border/60 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-normal text-muted-foreground">
                {t('reports.certsThisMonth.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex h-[calc(100%-56px)] flex-col justify-end gap-3">
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-[64px] font-semibold leading-none tabular-nums text-foreground">
                  {formatNumber(data.certsThisMonth)}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                    deltaPositive
                      ? 'border-[oklch(0.57_0.17_138/0.4)] bg-[oklch(0.57_0.17_138/0.14)] text-[oklch(0.5_0.16_138)] dark:text-[oklch(0.78_0.14_138)]'
                      : 'border-[oklch(0.64_0.21_25/0.4)] bg-[oklch(0.64_0.21_25/0.12)] text-[oklch(0.55_0.2_25)] dark:text-[oklch(0.72_0.17_22)]'
                  }`}
                >
                  <DeltaIcon className="size-3" aria-hidden="true" />
                  {deltaPositive ? '+' : ''}
                  {formatNumber(data.certsDelta)}
                </span>
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {t('reports.certsThisMonth.delta')}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Row 3 — top courses + upcoming */}
        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="md:col-span-6 lg:col-span-8"
        >
          <Card className="h-full border-border/60 shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-xl font-normal text-foreground">
                {t('reports.topCourses.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.topCourses.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('reports.noRecords')}
                </p>
              ) : (
                <TopCoursesBar data={data.topCourses} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={fadeUp}
          transition={transitionDefaults}
          className="md:col-span-6 lg:col-span-4"
        >
          <Card className="h-full border-border/60 shadow-card">
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <CalendarDays className="size-4 text-brand-green-700" aria-hidden="true" />
              <CardTitle className="font-display text-xl font-normal text-foreground">
                {t('reports.upcoming.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UpcomingList items={data.upcoming} emptyLabel={t('reports.noRecords')} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.section>
    </div>
  )
}
