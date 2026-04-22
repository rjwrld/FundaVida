import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeleteTeacher, useTeachers } from '@/hooks/api'
import type { TeacherFilters } from '@/data/api/teachers'

export function TeachersListPage() {
  const [filters, setFilters] = useState<TeacherFilters>({})
  const { data = [], isLoading } = useTeachers(filters)
  const deleteTeacher = useDeleteTeacher()
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
          <p className="text-sm text-muted-foreground">
            Manage teaching staff and their course assignments.
          </p>
        </div>
        <Button onClick={() => navigate('/app/teachers/new')}>New teacher</Button>
      </header>

      <section aria-label="Filters">
        <Input
          placeholder="Search by name or email"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          className="max-w-sm"
        />
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No teachers found.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Courses</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((t) => {
              const hasCourses = t.courseIds.length > 0
              return (
                <TableRow key={t.id}>
                  <TableCell>
                    <Link to={`/app/teachers/${t.id}`} className="hover:underline">
                      {t.firstName} {t.lastName}
                    </Link>
                  </TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>{t.courseIds.length}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/app/teachers/${t.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={hasCourses}
                      title={
                        hasCourses
                          ? 'Reassign this teacher\u2019s courses before deleting.'
                          : undefined
                      }
                      onClick={() => {
                        if (confirm(`Delete ${t.firstName} ${t.lastName}?`)) {
                          deleteTeacher.mutate(t.id)
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
    </div>
  )
}
