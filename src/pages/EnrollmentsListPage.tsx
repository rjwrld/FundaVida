import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
import { useDeleteEnrollment, useEnrollments } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { EnrollmentFilters } from '@/data/api/enrollments'

export function EnrollmentsListPage() {
  const [filters, setFilters] = useState<EnrollmentFilters>({})
  const { data = [], isLoading } = useEnrollments(filters)
  const deleteEnrollment = useDeleteEnrollment()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Enrollments</h1>
        <p className="text-sm text-muted-foreground">
          Every student-course enrollment. Unenroll to also remove the matching grade.
        </p>
      </header>

      <section aria-label="Filters" className="grid gap-3 sm:grid-cols-2">
        <Select
          value={filters.studentId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, studentId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Student" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any student</SelectItem>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.courseId ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, courseId: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any course</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No enrollments match the current filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => {
              const s = students.find((x) => x.id === e.studentId)
              const c = courses.find((x) => x.id === e.courseId)
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    {s?.firstName} {s?.lastName}
                  </TableCell>
                  <TableCell>{c?.name}</TableCell>
                  <TableCell>{new Date(e.enrolledAt).toLocaleDateString('en-US')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          confirm(
                            `Unenroll ${s?.firstName ?? ''} ${s?.lastName ?? ''} from ${c?.name ?? ''}? Matching grade will also be removed.`
                          )
                        ) {
                          deleteEnrollment.mutate(e.id)
                        }
                      }}
                    >
                      Unenroll
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
