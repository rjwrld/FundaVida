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
import { EditGradeDialog } from '@/components/grades/EditGradeDialog'
import { useDeleteGrade, useGrades } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { GradeFilters } from '@/data/api/grades'

interface EditTarget {
  id: string
  initialScore: number
  studentName: string
  courseName: string
}

export function GradesListPage() {
  const [filters, setFilters] = useState<GradeFilters>({})
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
  const { data = [], isLoading } = useGrades(filters)
  const deleteGrade = useDeleteGrade()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Grades</h1>
        <p className="text-sm text-muted-foreground">
          Every grade in the system. Admins can correct or remove entries.
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
          No grades match the current filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Issued</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((g) => {
              const s = students.find((x) => x.id === g.studentId)
              const c = courses.find((x) => x.id === g.courseId)
              const studentName = `${s?.firstName ?? ''} ${s?.lastName ?? ''}`.trim()
              const courseName = c?.name ?? ''
              return (
                <TableRow key={g.id}>
                  <TableCell>{studentName || '—'}</TableCell>
                  <TableCell>{courseName || '—'}</TableCell>
                  <TableCell>{g.score}</TableCell>
                  <TableCell>{new Date(g.issuedAt).toLocaleDateString('en-US')}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEditTarget({
                          id: g.id,
                          initialScore: g.score,
                          studentName,
                          courseName,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete grade for ${studentName} in ${courseName}?`)) {
                          deleteGrade.mutate(g.id)
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <EditGradeDialog
        gradeId={editTarget?.id ?? null}
        initialScore={editTarget?.initialScore ?? 0}
        studentName={editTarget?.studentName ?? ''}
        courseName={editTarget?.courseName ?? ''}
        onClose={() => setEditTarget(null)}
      />
    </div>
  )
}
