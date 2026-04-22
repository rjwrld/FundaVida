import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
import { useAttendance } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { AttendanceFilters } from '@/data/api/attendance'
import type { AttendanceStatus } from '@/types'

const STATUS_OPTIONS: AttendanceStatus[] = ['present', 'absent', 'excused']

function statusVariant(
  status: AttendanceStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'present') return 'default'
  if (status === 'absent') return 'destructive'
  return 'secondary'
}

export function AttendanceListPage() {
  const role = useStore((s) => s.role)
  const [filters, setFilters] = useState<AttendanceFilters>({})
  const { data = [], isLoading } = useAttendance(filters)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">Per-session attendance across your scope.</p>
      </header>

      <section aria-label="Filters" className="grid gap-3 sm:grid-cols-3">
        {role === 'admin' && (
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
        )}
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
        <Select
          value={filters.status ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, status: v === 'any' ? undefined : (v as AttendanceStatus) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No attendance records match.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((r) => {
              const s = students.find((x) => x.id === r.studentId)
              const c = courses.find((x) => x.id === r.courseId)
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    {s?.firstName} {s?.lastName}
                  </TableCell>
                  <TableCell>{c?.name}</TableCell>
                  <TableCell>{new Date(r.sessionDate).toLocaleDateString('en-US')}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
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
