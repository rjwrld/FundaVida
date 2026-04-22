import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/data/store'

function AdminCards() {
  const students = useStore((s) => s.students.length)
  const teachers = useStore((s) => s.teachers.length)
  const courses = useStore((s) => s.courses.length)
  const grades = useStore((s) => s.grades.length)
  const entries: [string, number][] = [
    ['students', students],
    ['teachers', teachers],
    ['courses', courses],
    ['grades', grades],
  ]
  return (
    <section
      aria-labelledby="overview-heading"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <h2 id="overview-heading" className="sr-only">
        Overview
      </h2>
      {entries.map(([label, value]) => (
        <Card key={label}>
          <CardHeader>
            <CardTitle className="capitalize">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function TeacherCards() {
  const students = useStore((s) => s.students.length)
  const courses = useStore((s) => s.courses.filter((c) => c.teacherId === s.currentUserId).length)
  const entries: [string, number][] = [
    ['my courses', courses],
    ['students', students],
  ]
  return (
    <section
      aria-labelledby="overview-heading"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 max-w-2xl"
    >
      <h2 id="overview-heading" className="sr-only">
        Overview
      </h2>
      {entries.map(([label, value]) => (
        <Card key={label}>
          <CardHeader>
            <CardTitle className="capitalize">{label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{value}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}

function PlaceholderPanel({ role }: { role: string }) {
  const copy =
    role === 'student'
      ? 'Browse your enrolled courses and download your certificates from the sidebar.'
      : 'TCU reports arrive in a later phase.'
  return (
    <section aria-labelledby="overview-heading" className="max-w-2xl">
      <h2 id="overview-heading" className="sr-only">
        Overview
      </h2>
      <Card>
        <CardHeader>
          <CardTitle>Your {role} dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{copy}</p>
        </CardContent>
      </Card>
    </section>
  )
}

export function DashboardPage() {
  const roleOrNull = useStore((s) => s.role)
  if (!roleOrNull) return null
  const role = roleOrNull

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Signed in as {role}</h1>
        <p className="text-sm text-muted-foreground">
          Demo dashboard. Domain modules land in subsequent phases.
        </p>
      </header>
      {role === 'admin' && <AdminCards />}
      {role === 'teacher' && <TeacherCards />}
      {(role === 'student' || role === 'tcu') && <PlaceholderPanel role={role} />}
    </div>
  )
}
