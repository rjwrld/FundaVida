import { useState } from 'react'
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
import { useTcuActivities } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { TcuFilters } from '@/data/api/tcu'

export function TcuListPage() {
  const role = useStore((s) => s.role)
  const [filters, setFilters] = useState<TcuFilters>({})
  const { data = [], isLoading } = useTcuActivities(filters)
  const students = useStore((s) => s.students)

  const totalHours = data.reduce((sum, a) => sum + a.hours, 0)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">TCU activities</h1>
        <p className="text-sm text-muted-foreground">
          Community service hours logged per student. {totalHours} hours total in view.
        </p>
      </header>

      {role === 'admin' && (
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
            value={filters.organizerId ?? 'any'}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, organizerId: v === 'any' ? undefined : v }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Organizer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any organizer</SelectItem>
              <SelectItem value="tcu-1">TCU-1</SelectItem>
            </SelectContent>
          </Select>
        </section>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No activities logged yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Organizer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((a) => {
              const s = students.find((x) => x.id === a.studentId)
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    {s?.firstName} {s?.lastName}
                  </TableCell>
                  <TableCell>{a.title}</TableCell>
                  <TableCell>{a.hours}</TableCell>
                  <TableCell>{new Date(a.date).toLocaleDateString('en-US')}</TableCell>
                  <TableCell>{a.organizerId ?? '—'}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
