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
import { useDeleteStudent, useStudents } from '@/hooks/api'
import type { StudentFilters } from '@/data/api/students'
import { EDUCATIONAL_LEVELS, PROVINCES } from '@/constants/student'

export function StudentsListPage() {
  const [filters, setFilters] = useState<StudentFilters>({})
  const { data = [], isLoading } = useStudents(filters)
  const deleteStudent = useDeleteStudent()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
          <p className="text-sm text-muted-foreground">
            Manage enrolled students and their profiles.
          </p>
        </div>
        <Button onClick={() => navigate('/app/students/new')}>New student</Button>
      </header>

      <section aria-label="Filters" className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Search by name or email"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
        />
        <Select
          value={filters.province ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, province: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Province" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any province</SelectItem>
            {PROVINCES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.educationalLevel ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, educationalLevel: v === 'any' ? undefined : v }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any level</SelectItem>
            {EDUCATIONAL_LEVELS.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No students match these filters.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Province</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((s) => (
              <TableRow key={s.id}>
                <TableCell>
                  <Link to={`/app/students/${s.id}`} className="hover:underline">
                    {s.firstName} {s.lastName}
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.email}</TableCell>
                <TableCell>{s.province}</TableCell>
                <TableCell>{s.educationalLevel}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/app/students/${s.id}/edit`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete ${s.firstName} ${s.lastName}?`)) {
                        deleteStudent.mutate(s.id)
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
