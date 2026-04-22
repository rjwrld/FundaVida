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

function formatPercent(v: number | null): string {
  if (v === null) return '—'
  return `${Math.round(v * 100)}%`
}

function formatAverage(v: number | null): string {
  if (v === null) return '—'
  return v.toFixed(1)
}

export function ReportsPage() {
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
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Cross-cutting view of enrollments, grades, attendance, and community hours.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{report.totals.students}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{report.totals.teachers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{report.totals.courses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{report.totals.enrollments}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top enrollments by course</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Enrollments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.enrollmentsByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average grade by course</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.averageGradeByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">{formatAverage(row.average)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance present rate</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.presentRateByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top TCU hours by student</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.tcuHoursByStudent.slice(0, 10).map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>{row.studentName}</TableCell>
                    <TableCell className="text-right">{row.totalHours}</TableCell>
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
