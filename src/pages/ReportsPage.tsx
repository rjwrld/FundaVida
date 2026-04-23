import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStore } from '@/data/store'
import { buildReports } from '@/lib/reports'
import { useFormat } from '@/hooks/useFormat'

export function ReportsPage() {
  const { t } = useTranslation()
  const { formatNumber, formatPercent, formatGrade } = useFormat()
  const students = useStore((s) => s.students)
  const teachers = useStore((s) => s.teachers)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
  const attendance = useStore((s) => s.attendance)
  const tcuActivities = useStore((s) => s.tcuActivities)

  const report = buildReports({
    students,
    teachers,
    courses,
    enrollments,
    grades,
    attendance,
    tcuActivities,
  })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t('reports.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('reports.subtitle')}</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('reports.totals.students')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(report.totals.students)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('reports.totals.teachers')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(report.totals.teachers)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('reports.totals.courses')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(report.totals.courses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('reports.totals.enrollments')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{formatNumber(report.totals.enrollments)}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.sections.enrollmentsByCourse')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.columns.course')}</TableHead>
                  <TableHead className="text-right">{t('reports.columns.count')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.enrollmentsByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.count)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.sections.averageGradeByCourse')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.columns.course')}</TableHead>
                  <TableHead className="text-right">{t('reports.columns.average')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.averageGradeByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">
                      {row.average === null ? t('reports.noRecords') : formatGrade(row.average)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.sections.presentRateByCourse')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.columns.course')}</TableHead>
                  <TableHead className="text-right">{t('reports.columns.rate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.presentRateByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">
                      {row.rate === null ? t('reports.noRecords') : formatPercent(row.rate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.sections.tcuHoursByStudent')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reports.columns.student')}</TableHead>
                  <TableHead className="text-right">{t('reports.columns.hours')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.tcuHoursByStudent.slice(0, 10).map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>{row.studentName}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.totalHours)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
