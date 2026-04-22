import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useCourses, useDeleteCourse } from '@/hooks/api'
import { HEADQUARTERS, PROGRAMS } from '@/constants/course'
import type { CourseFilters } from '@/data/api/courses'
import { useStore } from '@/data/store'

export function CoursesListPage() {
  const [filters, setFilters] = useState<CourseFilters>({})
  const { data = [], isLoading } = useCourses(filters)
  const deleteCourse = useDeleteCourse()
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const teachers = useStore((s) => s.teachers)
  const isAdmin = role === 'admin'

  const teacherName = (teacherId: string) => {
    const t = teachers.find((x) => x.id === teacherId)
    return t ? `${t.firstName} ${t.lastName}` : teacherId
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Courses</h1>
          <p className="text-sm text-muted-foreground">
            Browse courses, manage enrollments, and grade students.
          </p>
        </div>
        {isAdmin && <Button onClick={() => navigate('/app/courses/new')}>New course</Button>}
      </header>

      <section aria-label="Filters" className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Search by name or description"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
        />
        <Select
          value={filters.headquartersName ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, headquartersName: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger aria-label="Headquarters">
            <SelectValue placeholder="Headquarters" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any headquarters</SelectItem>
            {HEADQUARTERS.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.programName ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, programName: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger aria-label="Program">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any program</SelectItem>
            {PROGRAMS.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No courses match these filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Headquarters</TableHead>
              <TableHead>Teacher</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link to={`/app/courses/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.programName}</TableCell>
                <TableCell>{c.headquartersName}</TableCell>
                <TableCell>{teacherName(c.teacherId)}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/app/courses/${c.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Delete ${c.name}?`)) {
                          deleteCourse.mutate(c.id)
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
