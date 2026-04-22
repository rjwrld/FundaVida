import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/data/store'

export function DashboardPage() {
  const roleOrNull = useStore((s) => s.role)
  const studentCount = useStore((s) => s.students.length)
  const teacherCount = useStore((s) => s.teachers.length)
  const courseCount = useStore((s) => s.courses.length)
  const gradeCount = useStore((s) => s.grades.length)

  // RoleRequired guards this route and redirects to / if role is null.
  if (!roleOrNull) return null

  const role: string = roleOrNull

  const stats: { key: string; label: string; count: number }[] = [
    { key: 'students', label: 'students', count: studentCount },
    { key: 'teachers', label: 'teachers', count: teacherCount },
    { key: 'courses', label: 'courses', count: courseCount },
    { key: 'grades', label: 'grades', count: gradeCount },
  ]

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Signed in as {role}</h1>
        <p className="text-sm text-muted-foreground">
          Demo dashboard. Domain modules land in subsequent phases.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ key, label, count }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="capitalize">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{count}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
