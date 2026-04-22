import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStudent } from '@/hooks/api'
import { useStore } from '@/data/store'

export function StudentsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: student, isLoading } = useStudent(id ?? '')
  const courses = useStore((s) => s.courses)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (!student) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Student not found.</p>
        <Button asChild variant="outline">
          <Link to="/app/students">Back to students</Link>
        </Button>
      </div>
    )
  }

  const enrolledCourses = courses.filter((c) => student.enrolledCourseIds.includes(c.id))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/students')}>
            Back
          </Button>
          <Button onClick={() => navigate(`/app/students/${student.id}/edit`)}>Edit</Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Province:</span> {student.province}
            </p>
            <p>
              <span className="text-muted-foreground">Canton:</span> {student.canton}
            </p>
            <p>
              <span className="text-muted-foreground">Level:</span> {student.educationalLevel}
            </p>
            <p>
              <span className="text-muted-foreground">Gender:</span> {student.gender}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enrolled in any courses.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {enrolledCourses.map((c) => (
                  <li key={c.id}>
                    <Link to={`/app/courses/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {c.programName}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
