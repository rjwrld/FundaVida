# Phase 5b — Reports, Audit Logs, Bulk Email Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship three admin-only Tier 3 modules — Reports (cross-cutting analytics), Audit Logs (system event history), and Bulk Email (compose + filter + simulated send) — completing Tier 3 read-only coverage and giving the admin role its final cross-cutting views.

**Architecture:** Reports is a pure derivation page (no new store state, no mutations) built from existing arrays. Audit Logs introduces a seeded historical log plus live emitter calls threaded through every existing mutation so the module reflects real activity. Bulk Email introduces a composition form, dropdown-based recipient filter with a live preview count, a simulated Send action that persists a sent-email record, and a history table. All three modules are admin-only.

**Tech Stack:** React 18 · TypeScript (strict) · Vite · Zustand · @tanstack/react-query · React Hook Form · Zod · React Router v6 · Tailwind · shadcn/ui · Vitest · Playwright.

**Phase output:** admin can open Reports for an at-a-glance view of enrollments, grades, attendance, and TCU hours; open Audit Logs to see chronological evidence of every create/update/delete performed since the demo reset; and open Bulk Email to draft a message, filter recipients, preview the count, send, and see the campaign in the history table.

**Workflow reminders:**

- One branch → one PR → one merge into `main` per Task.
- Start each Task by branching off a fresh `main`.
- Never `Co-Authored-By: Claude` trailers. Never "Generated with Claude Code" footers.
- Never push to `main`. Never force-push.
- Conventional commits, lowercase-first imperative (commitlint enforces this; sentence-case blocked).

**Persistence migration note:** Tasks 2 and 3 each add new arrays to `SeedSnapshot` (`auditLog` in Task 2, `emailCampaigns` in Task 3). The validator at `src/data/persistence.ts` is extended to require them, so pre-5b persisted state fails validation and is replaced with a fresh seed on next load. Reset demo remains one click away.

---

## Task 1: Reports module

**Branch:** `feat/reports-module`

**Files:**

- Create: `src/lib/reports.ts`
- Create: `src/lib/__tests__/reports.test.ts`
- Create: `src/pages/ReportsPage.tsx`
- Modify: `src/constants/nav.ts` (add Reports entry)
- Modify: `src/App.tsx` (register route)
- Create: `e2e/reports.spec.ts`

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/reports-module
```

### Step 2: Aggregation helpers at `src/lib/reports.ts`

```ts
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  AttendanceRecord,
  TcuActivity,
} from '@/types'

export interface ReportsInput {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  tcuActivities: TcuActivity[]
}

export interface Totals {
  students: number
  teachers: number
  courses: number
  enrollments: number
}

export interface EnrollmentByCourse {
  courseId: string
  courseName: string
  count: number
}

export interface AverageGradeByCourse {
  courseId: string
  courseName: string
  average: number | null
}

export interface PresentRateByCourse {
  courseId: string
  courseName: string
  rate: number | null
}

export interface TcuHoursByStudent {
  studentId: string
  studentName: string
  totalHours: number
}

export interface ReportsSnapshot {
  totals: Totals
  enrollmentsByCourse: EnrollmentByCourse[]
  averageGradeByCourse: AverageGradeByCourse[]
  presentRateByCourse: PresentRateByCourse[]
  tcuHoursByStudent: TcuHoursByStudent[]
}

export function buildReports(input: ReportsInput): ReportsSnapshot {
  const { students, teachers, courses, enrollments, grades, attendance, tcuActivities } = input
  const courseName = new Map(courses.map((c) => [c.id, c.name]))
  const studentName = new Map(students.map((s) => [s.id, `${s.firstName} ${s.lastName}`]))

  const enrollmentsByCourse: EnrollmentByCourse[] = courses
    .map((c) => ({
      courseId: c.id,
      courseName: c.name,
      count: enrollments.filter((e) => e.courseId === c.id).length,
    }))
    .sort((a, b) => b.count - a.count)

  const averageGradeByCourse: AverageGradeByCourse[] = courses
    .map((c) => {
      const scores = grades.filter((g) => g.courseId === c.id).map((g) => g.score)
      const average =
        scores.length === 0 ? null : scores.reduce((sum, s) => sum + s, 0) / scores.length
      return { courseId: c.id, courseName: c.name, average }
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1))

  const presentRateByCourse: PresentRateByCourse[] = courses
    .map((c) => {
      const records = attendance.filter((r) => r.courseId === c.id)
      if (records.length === 0) return { courseId: c.id, courseName: c.name, rate: null }
      const present = records.filter((r) => r.status === 'present').length
      return { courseId: c.id, courseName: c.name, rate: present / records.length }
    })
    .sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1))

  const hoursByStudent = new Map<string, number>()
  tcuActivities.forEach((a) => {
    hoursByStudent.set(a.studentId, (hoursByStudent.get(a.studentId) ?? 0) + a.hours)
  })
  const tcuHoursByStudent: TcuHoursByStudent[] = Array.from(hoursByStudent.entries())
    .map(([studentId, totalHours]) => ({
      studentId,
      studentName: studentName.get(studentId) ?? studentId,
      totalHours,
    }))
    .sort((a, b) => b.totalHours - a.totalHours)

  // Silence unused-warning if any of the lookup maps aren't referenced elsewhere.
  void courseName

  return {
    totals: {
      students: students.length,
      teachers: teachers.length,
      courses: courses.length,
      enrollments: enrollments.length,
    },
    enrollmentsByCourse,
    averageGradeByCourse,
    presentRateByCourse,
    tcuHoursByStudent,
  }
}
```

### Step 3: Unit tests at `src/lib/__tests__/reports.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { buildReports } from '../reports'
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  AttendanceRecord,
  TcuActivity,
} from '@/types'

function iso() {
  return new Date().toISOString()
}

const students: Student[] = [
  {
    id: 'stu-1',
    firstName: 'Ana',
    lastName: 'Mora',
    email: 'a@fv.cr',
    gender: 'F',
    province: 'San José',
    canton: 'Central',
    educationalLevel: 'Primary',
    enrolledCourseIds: ['cou-1'],
    createdAt: iso(),
  },
  {
    id: 'stu-2',
    firstName: 'Bruno',
    lastName: 'Li',
    email: 'b@fv.cr',
    gender: 'M',
    province: 'Heredia',
    canton: 'Belén',
    educationalLevel: 'Secondary',
    enrolledCourseIds: [],
    createdAt: iso(),
  },
]
const teachers: Teacher[] = [
  {
    id: 'tea-1',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'j@fv.cr',
    courseIds: ['cou-1'],
    createdAt: iso(),
  },
]
const courses: Course[] = [
  {
    id: 'cou-1',
    name: 'Intro to Baking',
    description: '',
    headquartersName: 'HQ',
    programName: 'Culinary',
    teacherId: 'tea-1',
    createdAt: iso(),
  },
  {
    id: 'cou-2',
    name: 'Accounting Basics',
    description: '',
    headquartersName: 'HQ',
    programName: 'Business',
    teacherId: 'tea-1',
    createdAt: iso(),
  },
]
const enrollments: Enrollment[] = [
  { id: 'enr-1', studentId: 'stu-1', courseId: 'cou-1', enrolledAt: iso() },
]
const grades: Grade[] = [
  { id: 'gra-1', studentId: 'stu-1', courseId: 'cou-1', score: 80, issuedAt: iso() },
]
const attendance: AttendanceRecord[] = [
  { id: 'att-1', studentId: 'stu-1', courseId: 'cou-1', sessionDate: iso(), status: 'present' },
  { id: 'att-2', studentId: 'stu-1', courseId: 'cou-1', sessionDate: iso(), status: 'absent' },
]
const tcuActivities: TcuActivity[] = [
  { id: 'tcu-act-1', studentId: 'stu-1', title: 'X', description: '', hours: 4, date: iso() },
  { id: 'tcu-act-2', studentId: 'stu-1', title: 'Y', description: '', hours: 2, date: iso() },
]

describe('buildReports', () => {
  it('computes totals', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    expect(r.totals).toEqual({ students: 2, teachers: 1, courses: 2, enrollments: 1 })
  })

  it('ranks enrollmentsByCourse descending', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    expect(r.enrollmentsByCourse[0]?.courseId).toBe('cou-1')
    expect(r.enrollmentsByCourse[0]?.count).toBe(1)
  })

  it('returns null average for courses with no grades', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    const c2 = r.averageGradeByCourse.find((x) => x.courseId === 'cou-2')
    expect(c2?.average).toBeNull()
  })

  it('computes present rate as present / total', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    const c1 = r.presentRateByCourse.find((x) => x.courseId === 'cou-1')
    expect(c1?.rate).toBe(0.5)
  })

  it('sums tcu hours per student and sorts descending', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    expect(r.tcuHoursByStudent[0]?.studentId).toBe('stu-1')
    expect(r.tcuHoursByStudent[0]?.totalHours).toBe(6)
  })

  it('excludes students with no tcu activities from tcuHoursByStudent', () => {
    const r = buildReports({
      students,
      teachers,
      courses,
      enrollments,
      grades,
      attendance,
      tcuActivities,
    })
    expect(r.tcuHoursByStudent.find((x) => x.studentId === 'stu-2')).toBeUndefined()
  })
})
```

### Step 4: Page at `src/pages/ReportsPage.tsx`

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStore } from '@/data/store'
import { buildReports } from '@/lib/reports'

function formatPercent(v: number | null): string {
  if (v === null) return '—'
  return `${Math.round(v * 100)}%`
}

function formatAverage(v: number | null): string {
  if (v === null) return '—'
  return v.toFixed(1)
}

export function ReportsPage() {
  const students = useStore((s) => s.students)
  const teachers = useStore((s) => s.teachers)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
  const attendance = useStore((s) => s.attendance)
  const tcuActivities = useStore((s) => s.tcuActivities)

  const report = buildReports({
    students,
    teachers,
    courses,
    enrollments,
    grades,
    attendance,
    tcuActivities,
  })

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Cross-cutting view of enrollments, grades, attendance, and community hours.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{report.totals.students}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Teachers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{report.totals.teachers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{report.totals.courses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{report.totals.enrollments}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top enrollments by course</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Enrollments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.enrollmentsByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average grade by course</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.averageGradeByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">{formatAverage(row.average)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance present rate</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.presentRateByCourse.slice(0, 5).map((row) => (
                  <TableRow key={row.courseId}>
                    <TableCell>{row.courseName}</TableCell>
                    <TableCell className="text-right">{formatPercent(row.rate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top TCU hours by student</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.tcuHoursByStudent.slice(0, 10).map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell>{row.studentName}</TableCell>
                    <TableCell className="text-right">{row.totalHours}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
```

### Step 5: Nav entry and route

In `src/constants/nav.ts`, add Reports after Attendance (admin-only):

Final order on this branch:

```ts
{ to: '/app', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'tcu'] },
{ to: '/app/students', label: 'Students', roles: ['admin', 'teacher'] },
{ to: '/app/teachers', label: 'Teachers', roles: ['admin'] },
{ to: '/app/enrollments', label: 'Enrollments', roles: ['admin'] },
{ to: '/app/courses', label: 'Courses', roles: ['admin', 'teacher', 'student'] },
{ to: '/app/grades', label: 'Grades', roles: ['admin'] },
{ to: '/app/attendance', label: 'Attendance', roles: ['admin', 'teacher', 'student'] },
{ to: '/app/reports', label: 'Reports', roles: ['admin'] },
{ to: '/app/certificates', label: 'Certificates', roles: ['admin', 'student'] },
{ to: '/app/tcu', label: 'TCU', roles: ['admin', 'student', 'tcu'] },
```

In `src/App.tsx`:

- Add `import { ReportsPage } from '@/pages/ReportsPage'`.
- Add the route inside an `admin`-only `RoleGate` block (reuse the existing one that wraps Teachers/Enrollments/Grades if present, or add a new block):

```tsx
<Route element={<RoleGate allow={['admin']} />}>
  <Route path="reports" element={<ReportsPage />} />
</Route>
```

### Step 6: E2E at `e2e/reports.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('admin sees report cards and section tables', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Reports' }).click()
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()

  // Four summary cards.
  await expect(page.getByText('Students', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Teachers', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Courses', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Enrollments', { exact: true }).first()).toBeVisible()

  // Four section cards.
  await expect(page.getByRole('heading', { name: 'Top enrollments by course' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Average grade by course' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Attendance present rate' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Top TCU hours by student' })).toBeVisible()
})
```

### Step 7: Gauntlet, commit, PR

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run e2e`. Fix any failures. If certificates flakes with the UUID-filename symptom, re-run once; don't touch certificates code.

Commit:

```
feat: add reports module (admin analytics)

- buildReports takes a store snapshot and returns totals,
  enrollments per course (ranked), average grade per course,
  attendance present-rate per course, and TCU hours per
  student (ranked). Pure function, covered by unit tests.
- ReportsPage reads the current store snapshot and renders
  four summary cards plus four section tables (top 5 by
  enrollment, top 5 by average grade, top 5 by present rate,
  top 10 by TCU hours).
- Route gated to admin. Nav entry added between Attendance
  and Certificates.
- E2E: admin opens Reports and sees all four summary cards
  and all four section headings.
```

PR title: `feat: add reports module (admin analytics)`.

Stop — do not merge.

---

## Task 2: Audit Logs module

**Branch:** `feat/audit-log-module`

**Files:**

- Modify: `src/types/domain.ts` (add `AuditLogEntry` + `AuditAction` + `AuditEntity`)
- Create: `src/data/seed/auditLog.ts`
- Modify: `src/data/seed/index.ts` (include `auditLog` in `SeedSnapshot`)
- Modify: `src/data/persistence.ts` (validate `auditLog` in `isValidSnapshot`)
- Modify: `src/data/store.ts` (add `auditLog` state + `appendAuditLog` helper + instrument every mutation)
- Create: `src/data/api/auditLog.ts`
- Create: `src/data/__tests__/api.auditLog.test.ts`
- Modify: `src/data/api/index.ts` (register `auditLog: auditLogApi`)
- Create: `src/hooks/api/auditLog.ts`
- Modify: `src/hooks/api/index.ts` (re-export)
- Create: `src/pages/AuditLogPage.tsx`
- Modify: `src/constants/nav.ts` (add Audit Logs entry)
- Modify: `src/App.tsx` (register route)
- Modify: `src/data/__tests__/store.test.ts` (add tests proving mutations append log entries)
- Create: `e2e/audit-log.spec.ts`

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/audit-log-module
```

### Step 2: Types at `src/types/domain.ts`

Append:

```ts
export type AuditAction = 'create' | 'update' | 'delete' | 'enroll' | 'unenroll' | 'grade'

export type AuditEntity = 'student' | 'teacher' | 'course' | 'enrollment' | 'grade'

export interface AuditLogEntry {
  id: string
  actorId: string
  action: AuditAction
  entity: AuditEntity
  entityId: string
  timestamp: string
  summary: string
}
```

### Step 3: Seeder at `src/data/seed/auditLog.ts`

```ts
import { faker } from '@faker-js/faker'
import type { AuditLogEntry, Student, Teacher, Course, Enrollment, Grade } from '@/types'

export function seedAuditLog(input: {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
}): AuditLogEntry[] {
  faker.seed(49)
  const { students, teachers, courses, enrollments, grades } = input
  const entries: AuditLogEntry[] = []
  let idCounter = 1

  students.slice(0, 12).forEach((s) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'admin',
      action: 'create',
      entity: 'student',
      entityId: s.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Created student ${s.firstName} ${s.lastName}`,
    })
  })
  teachers.slice(0, 3).forEach((t) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'admin',
      action: 'create',
      entity: 'teacher',
      entityId: t.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Created teacher ${t.firstName} ${t.lastName}`,
    })
  })
  courses.slice(0, 4).forEach((c) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'admin',
      action: 'create',
      entity: 'course',
      entityId: c.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Created course ${c.name}`,
    })
  })
  enrollments.slice(0, 8).forEach((e) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'admin',
      action: 'enroll',
      entity: 'enrollment',
      entityId: e.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Enrolled student ${e.studentId} in course ${e.courseId}`,
    })
  })
  grades.slice(0, 10).forEach((g) => {
    entries.push({
      id: `log-${idCounter++}`,
      actorId: 'tea-1',
      action: 'grade',
      entity: 'grade',
      entityId: g.id,
      timestamp: faker.date.past({ years: 1 }).toISOString(),
      summary: `Graded student ${g.studentId} in course ${g.courseId} with ${g.score}`,
    })
  })

  // Most-recent first.
  return entries.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
}
```

### Step 4: Update `SeedSnapshot` at `src/data/seed/index.ts`

Replace the full file:

```ts
import { seedStudents } from './students'
import { seedTeachers } from './teachers'
import { seedCourses } from './courses'
import { seedEnrollments } from './enrollments'
import { seedGrades } from './grades'
import { seedTcuActivities } from './tcuActivities'
import { seedAttendance } from './attendance'
import { seedAuditLog } from './auditLog'
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  TcuActivity,
  AttendanceRecord,
  AuditLogEntry,
} from '@/types'

export interface SeedSnapshot {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  tcuActivities: TcuActivity[]
  attendance: AttendanceRecord[]
  auditLog: AuditLogEntry[]
}

export function buildSeedSnapshot(): SeedSnapshot {
  const teachers = seedTeachers()
  const teacherIds = teachers.map((t) => t.id)
  const courses = seedCourses(teacherIds)

  courses.forEach((c) => {
    const teacher = teachers.find((t) => t.id === c.teacherId)
    if (teacher && !teacher.courseIds.includes(c.id)) teacher.courseIds.push(c.id)
  })

  const students = seedStudents()
  const studentIds = students.map((s) => s.id)
  const courseIds = courses.map((c) => c.id)
  const enrollments = seedEnrollments(studentIds, courseIds)

  enrollments.forEach((e) => {
    const student = students.find((s) => s.id === e.studentId)
    if (student && !student.enrolledCourseIds.includes(e.courseId)) {
      student.enrolledCourseIds.push(e.courseId)
    }
  })

  const grades = seedGrades(enrollments)
  const tcuActivities = seedTcuActivities(studentIds)
  const attendance = seedAttendance(enrollments, courseIds)
  const auditLog = seedAuditLog({ students, teachers, courses, enrollments, grades })

  return { students, teachers, courses, enrollments, grades, tcuActivities, attendance, auditLog }
}
```

### Step 5: Update persistence validator

In `src/data/persistence.ts`:

```ts
function isValidSnapshot(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.students) &&
    Array.isArray(v.teachers) &&
    Array.isArray(v.courses) &&
    Array.isArray(v.enrollments) &&
    Array.isArray(v.grades) &&
    Array.isArray(v.tcuActivities) &&
    Array.isArray(v.attendance) &&
    Array.isArray(v.auditLog)
  )
}
```

### Step 6: Extend `src/data/store.ts`

Add `AuditLogEntry` + `AuditAction` + `AuditEntity` to the `@/types` import list. Add `auditLog: AuditLogEntry[]` to `StoreState` after `attendance`. Extend the `Pick<...>` in `initialState`'s return type to include `'auditLog'`. In the persisted branch, carry `auditLog: persisted.auditLog`. Add `auditLog: state.auditLog` to the `persistSnapshot` payload.

Add a module-private helper near the top of the file (outside the store):

```ts
function makeAuditEntry(
  state: StoreState,
  entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'actorId'>
): AuditLogEntry {
  return {
    id: `log-${Date.now()}-${state.auditLog.length + 1}`,
    actorId: state.currentUserId ?? 'system',
    timestamp: new Date().toISOString(),
    ...entry,
  }
}
```

Now instrument every mutation. Each `set(...)` that currently sets arrays must now also include `auditLog: [makeAuditEntry(state, { ... }), ...state.auditLog]`. Show every mutation below.

**`createStudent`:**

```ts
createStudent: (input) => {
  const existing = get()
  const student: Student = {
    id: nextId('stu', existing.students),
    createdAt: new Date().toISOString(),
    enrolledCourseIds: [],
    ...input,
  }
  set((state) => ({
    students: [...state.students, student],
    auditLog: [
      makeAuditEntry(state, {
        action: 'create',
        entity: 'student',
        entityId: student.id,
        summary: `Created student ${student.firstName} ${student.lastName}`,
      }),
      ...state.auditLog,
    ],
  }))
  return student
},
```

**`updateStudent`:**

```ts
updateStudent: (id, patch) => {
  set((state) => ({
    students: state.students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    auditLog: [
      makeAuditEntry(state, {
        action: 'update',
        entity: 'student',
        entityId: id,
        summary: `Updated student ${id}`,
      }),
      ...state.auditLog,
    ],
  }))
},
```

**`deleteStudent`:**

```ts
deleteStudent: (id) => {
  set((state) => ({
    students: state.students.filter((s) => s.id !== id),
    enrollments: state.enrollments.filter((e) => e.studentId !== id),
    grades: state.grades.filter((g) => g.studentId !== id),
    attendance: state.attendance.filter((a) => a.studentId !== id),
    tcuActivities: state.tcuActivities.filter((a) => a.studentId !== id),
    auditLog: [
      makeAuditEntry(state, {
        action: 'delete',
        entity: 'student',
        entityId: id,
        summary: `Deleted student ${id}`,
      }),
      ...state.auditLog,
    ],
  }))
},
```

**`createCourse`:**

```ts
createCourse: (input) => {
  const existing = get()
  const course: Course = {
    id: nextId('cou', existing.courses),
    createdAt: new Date().toISOString(),
    ...input,
  }
  set((state) => {
    const updatedTeachers = state.teachers.map((t) =>
      t.id === course.teacherId ? { ...t, courseIds: [...t.courseIds, course.id] } : t
    )
    return {
      courses: [...state.courses, course],
      teachers: updatedTeachers,
      auditLog: [
        makeAuditEntry(state, {
          action: 'create',
          entity: 'course',
          entityId: course.id,
          summary: `Created course ${course.name}`,
        }),
        ...state.auditLog,
      ],
    }
  })
  return course
},
```

**`updateCourse`** — keep the existing teacher-reassignment logic; just add the audit entry to the returned object:

```ts
updateCourse: (id, patch) => {
  set((state) => {
    const current = state.courses.find((c) => c.id === id)
    const teacherChanged =
      current !== undefined &&
      patch.teacherId !== undefined &&
      patch.teacherId !== current.teacherId
    const updatedCourses = state.courses.map((c) => (c.id === id ? { ...c, ...patch } : c))
    const newTeacherId = patch.teacherId
    const audit = makeAuditEntry(state, {
      action: 'update',
      entity: 'course',
      entityId: id,
      summary: `Updated course ${id}`,
    })
    if (!teacherChanged || !current || !newTeacherId) {
      return { courses: updatedCourses, auditLog: [audit, ...state.auditLog] }
    }
    const oldTeacherId = current.teacherId
    const updatedTeachers = state.teachers.map((t) => {
      if (t.id === oldTeacherId) {
        return { ...t, courseIds: t.courseIds.filter((cid) => cid !== id) }
      }
      if (t.id === newTeacherId && !t.courseIds.includes(id)) {
        return { ...t, courseIds: [...t.courseIds, id] }
      }
      return t
    })
    return { courses: updatedCourses, teachers: updatedTeachers, auditLog: [audit, ...state.auditLog] }
  })
},
```

**`deleteCourse`:**

```ts
deleteCourse: (id) => {
  set((state) => ({
    courses: state.courses.filter((c) => c.id !== id),
    enrollments: state.enrollments.filter((e) => e.courseId !== id),
    grades: state.grades.filter((g) => g.courseId !== id),
    attendance: state.attendance.filter((a) => a.courseId !== id),
    teachers: state.teachers.map((t) => ({
      ...t,
      courseIds: t.courseIds.filter((cid) => cid !== id),
    })),
    students: state.students.map((s) => ({
      ...s,
      enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== id),
    })),
    auditLog: [
      makeAuditEntry(state, {
        action: 'delete',
        entity: 'course',
        entityId: id,
        summary: `Deleted course ${id}`,
      }),
      ...state.auditLog,
    ],
  }))
},
```

**`createTeacher`:**

```ts
createTeacher: (input) => {
  const existing = get()
  const teacher: Teacher = {
    id: nextId('tea', existing.teachers),
    createdAt: new Date().toISOString(),
    courseIds: [],
    ...input,
  }
  set((state) => ({
    teachers: [...state.teachers, teacher],
    auditLog: [
      makeAuditEntry(state, {
        action: 'create',
        entity: 'teacher',
        entityId: teacher.id,
        summary: `Created teacher ${teacher.firstName} ${teacher.lastName}`,
      }),
      ...state.auditLog,
    ],
  }))
  return teacher
},
```

**`updateTeacher`:**

```ts
updateTeacher: (id, patch) => {
  set((state) => ({
    teachers: state.teachers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    auditLog: [
      makeAuditEntry(state, {
        action: 'update',
        entity: 'teacher',
        entityId: id,
        summary: `Updated teacher ${id}`,
      }),
      ...state.auditLog,
    ],
  }))
},
```

**`deleteTeacher`** — keep the guard; add audit only on success:

```ts
deleteTeacher: (id) => {
  const { teachers } = get()
  const target = teachers.find((t) => t.id === id)
  if (!target) return
  if (target.courseIds.length > 0) {
    throw new Error(
      `Teacher ${id} has ${target.courseIds.length} course(s) assigned — reassign before deleting.`
    )
  }
  set((state) => ({
    teachers: state.teachers.filter((t) => t.id !== id),
    auditLog: [
      makeAuditEntry(state, {
        action: 'delete',
        entity: 'teacher',
        entityId: id,
        summary: `Deleted teacher ${id}`,
      }),
      ...state.auditLog,
    ],
  }))
},
```

**`enrollStudent`:**

```ts
enrollStudent: (studentId, courseId) => {
  const { enrollments } = get()
  const existing = enrollments.find((e) => e.studentId === studentId && e.courseId === courseId)
  if (existing) return existing
  const enrollment: Enrollment = {
    id: nextId('enr', enrollments),
    studentId,
    courseId,
    enrolledAt: new Date().toISOString(),
  }
  set((state) => {
    const updatedStudents = state.students.map((s) =>
      s.id === studentId && !s.enrolledCourseIds.includes(courseId)
        ? { ...s, enrolledCourseIds: [...s.enrolledCourseIds, courseId] }
        : s
    )
    return {
      enrollments: [...state.enrollments, enrollment],
      students: updatedStudents,
      auditLog: [
        makeAuditEntry(state, {
          action: 'enroll',
          entity: 'enrollment',
          entityId: enrollment.id,
          summary: `Enrolled ${studentId} in ${courseId}`,
        }),
        ...state.auditLog,
      ],
    }
  })
  return enrollment
},
```

**`unenrollStudent`:**

```ts
unenrollStudent: (enrollmentId) => {
  const { enrollments } = get()
  const target = enrollments.find((e) => e.id === enrollmentId)
  if (!target) return
  set((state) => {
    const updatedStudents = state.students.map((s) =>
      s.id === target.studentId
        ? {
            ...s,
            enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== target.courseId),
          }
        : s
    )
    return {
      enrollments: state.enrollments.filter((e) => e.id !== enrollmentId),
      grades: state.grades.filter(
        (g) => !(g.studentId === target.studentId && g.courseId === target.courseId)
      ),
      attendance: state.attendance.filter(
        (a) => !(a.studentId === target.studentId && a.courseId === target.courseId)
      ),
      students: updatedStudents,
      auditLog: [
        makeAuditEntry(state, {
          action: 'unenroll',
          entity: 'enrollment',
          entityId: enrollmentId,
          summary: `Unenrolled ${target.studentId} from ${target.courseId}`,
        }),
        ...state.auditLog,
      ],
    }
  })
},
```

**`setGrade`:**

```ts
setGrade: (studentId, courseId, score) => {
  const { grades } = get()
  const existing = grades.find((g) => g.studentId === studentId && g.courseId === courseId)
  if (existing) {
    const updated: Grade = { ...existing, score, issuedAt: new Date().toISOString() }
    set((state) => ({
      grades: state.grades.map((g) => (g.id === existing.id ? updated : g)),
      auditLog: [
        makeAuditEntry(state, {
          action: 'grade',
          entity: 'grade',
          entityId: existing.id,
          summary: `Updated grade for ${studentId} in ${courseId} to ${score}`,
        }),
        ...state.auditLog,
      ],
    }))
    return updated
  }
  const grade: Grade = {
    id: nextId('gra', grades),
    studentId,
    courseId,
    score,
    issuedAt: new Date().toISOString(),
  }
  set((state) => ({
    grades: [...state.grades, grade],
    auditLog: [
      makeAuditEntry(state, {
        action: 'grade',
        entity: 'grade',
        entityId: grade.id,
        summary: `Graded ${studentId} in ${courseId} with ${score}`,
      }),
      ...state.auditLog,
    ],
  }))
  return grade
},
```

**`updateGradeScore`:**

```ts
updateGradeScore: (gradeId, score) => {
  set((state) => ({
    grades: state.grades.map((g) =>
      g.id === gradeId ? { ...g, score, issuedAt: new Date().toISOString() } : g
    ),
    auditLog: [
      makeAuditEntry(state, {
        action: 'update',
        entity: 'grade',
        entityId: gradeId,
        summary: `Updated grade ${gradeId} to ${score}`,
      }),
      ...state.auditLog,
    ],
  }))
},
```

**`deleteGrade`:**

```ts
deleteGrade: (gradeId) => {
  set((state) => ({
    grades: state.grades.filter((g) => g.id !== gradeId),
    auditLog: [
      makeAuditEntry(state, {
        action: 'delete',
        entity: 'grade',
        entityId: gradeId,
        summary: `Deleted grade ${gradeId}`,
      }),
      ...state.auditLog,
    ],
  }))
},
```

**`resetDemo`** — also clears the audit log back to the seeded one. This already happens because `resetDemo` spreads `...snapshot`, and the new `snapshot` includes a fresh `auditLog`. No extra work.

### Step 7: API at `src/data/api/auditLog.ts`

```ts
import type { AuditLogEntry, AuditAction, AuditEntity } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface AuditLogFilters {
  action?: AuditAction
  entity?: AuditEntity
}

function applyRoleFilter(entries: AuditLogEntry[]): AuditLogEntry[] {
  const role = useStore.getState().role
  if (role === 'admin') return entries
  return []
}

function applyFilters(entries: AuditLogEntry[], filters: AuditLogFilters): AuditLogEntry[] {
  return entries.filter((e) => {
    if (filters.action && e.action !== filters.action) return false
    if (filters.entity && e.entity !== filters.entity) return false
    return true
  })
}

export const auditLogApi = {
  async list(filters: AuditLogFilters = {}): Promise<AuditLogEntry[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().auditLog), filters)
  },
}
```

### Step 8: Unit tests at `src/data/__tests__/api.auditLog.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { auditLogApi } from '../api/auditLog'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('auditLogApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns the seeded audit log for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await auditLogApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await auditLogApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await auditLogApi.list()).toEqual([])
    useStore.getState().setRole('tcu')
    expect(await auditLogApi.list()).toEqual([])
  })

  it('filters by action', async () => {
    useStore.getState().setRole('admin')
    const result = await auditLogApi.list({ action: 'create' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.action === 'create')).toBe(true)
  })

  it('filters by entity', async () => {
    useStore.getState().setRole('admin')
    const result = await auditLogApi.list({ entity: 'student' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((e) => e.entity === 'student')).toBe(true)
  })
})
```

Register in `src/data/api/index.ts`:

```ts
import { auditLogApi } from './auditLog'
// ...
export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
  enrollments: enrollmentsApi,
  grades: gradesApi,
  tcu: tcuApi,
  attendance: attendanceApi,
  auditLog: auditLogApi,
}
```

### Step 9: Hook at `src/hooks/api/auditLog.ts`

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { AuditLogFilters } from '@/data/api/auditLog'

const AUDIT_LOG_KEY = ['auditLog'] as const

export function useAuditLog(filters: AuditLogFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...AUDIT_LOG_KEY, role, filters],
    queryFn: () => api.auditLog.list(filters),
  })
}
```

Register in `src/hooks/api/index.ts`:

```ts
export * from './auditLog'
```

### Step 10: Invalidate `['auditLog']` from every mutation hook

Every existing mutation hook needs to invalidate `['auditLog']` in its `onSuccess` so the Audit Logs page refreshes after the action. Touch:

- `src/hooks/api/students.ts` — `useCreateStudent`, `useUpdateStudent`, `useDeleteStudent`.
- `src/hooks/api/teachers.ts` — `useCreateTeacher`, `useUpdateTeacher`, `useDeleteTeacher`.
- `src/hooks/api/courses.ts` — `useCreateCourse`, `useUpdateCourse`, `useDeleteCourse`, `useEnrollStudent`, `useUnenrollStudent`, `useSetGrade`.
- `src/hooks/api/enrollments.ts` — `useDeleteEnrollment`.
- `src/hooks/api/grades.ts` — `useUpdateGradeScore`, `useDeleteGrade`.

Add to each mutation's `onSuccess`:

```ts
client.invalidateQueries({ queryKey: ['auditLog'] })
```

### Step 11: Page at `src/pages/AuditLogPage.tsx`

```tsx
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
import { useAuditLog } from '@/hooks/api'
import type { AuditLogFilters } from '@/data/api/auditLog'
import type { AuditAction, AuditEntity } from '@/types'

const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'enroll', 'unenroll', 'grade']
const ENTITIES: AuditEntity[] = ['student', 'teacher', 'course', 'enrollment', 'grade']

export function AuditLogPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const { data = [], isLoading } = useAuditLog(filters)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit logs</h1>
        <p className="text-sm text-muted-foreground">
          Every create, update, and delete since the last demo reset, plus seeded history.
        </p>
      </header>

      <section aria-label="Filters" className="grid gap-3 sm:grid-cols-2">
        <Select
          value={filters.action ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, action: v === 'any' ? undefined : (v as AuditAction) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any action</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.entity ?? 'any'}
          onValueChange={(v) =>
            setFilters((f) => ({ ...f, entity: v === 'any' ? undefined : (v as AuditEntity) }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any entity</SelectItem>
            {ENTITIES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No audit entries match.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{new Date(e.timestamp).toLocaleString('en-US')}</TableCell>
                <TableCell>{e.actorId}</TableCell>
                <TableCell>{e.action}</TableCell>
                <TableCell>{e.entity}</TableCell>
                <TableCell>{e.summary}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
```

### Step 12: Nav entry and route

In `src/constants/nav.ts`, insert Audit Logs entry near the end (admin-only):

```ts
{ to: '/app/audit-log', label: 'Audit Logs', roles: ['admin'] },
```

Place it after Reports (if merged) or at the end before Certificates — pick a location that keeps admin-only items grouped. For this branch, add it as the second-to-last item (after TCU). Final order on this branch:

```ts
{ to: '/app', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'tcu'] },
{ to: '/app/students', label: 'Students', roles: ['admin', 'teacher'] },
{ to: '/app/teachers', label: 'Teachers', roles: ['admin'] },
{ to: '/app/enrollments', label: 'Enrollments', roles: ['admin'] },
{ to: '/app/courses', label: 'Courses', roles: ['admin', 'teacher', 'student'] },
{ to: '/app/grades', label: 'Grades', roles: ['admin'] },
{ to: '/app/attendance', label: 'Attendance', roles: ['admin', 'teacher', 'student'] },
{ to: '/app/certificates', label: 'Certificates', roles: ['admin', 'student'] },
{ to: '/app/tcu', label: 'TCU', roles: ['admin', 'student', 'tcu'] },
{ to: '/app/audit-log', label: 'Audit Logs', roles: ['admin'] },
```

(Reports will rebase this when it merges first — expect a small additive rebase like previous phases.)

In `src/App.tsx`:

- Add `import { AuditLogPage } from '@/pages/AuditLogPage'`.
- Add the route in an admin-only `RoleGate` block:

```tsx
<Route element={<RoleGate allow={['admin']} />}>
  <Route path="audit-log" element={<AuditLogPage />} />
</Route>
```

### Step 13: Store tests

Append to `src/data/__tests__/store.test.ts`:

```ts
describe('audit log instrumentation', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('createStudent appends a create entry', () => {
    const before = useStore.getState().auditLog.length
    const created = useStore.getState().createStudent({
      firstName: 'Nova',
      lastName: 'Pine',
      email: 'n@fv.cr',
      gender: 'F',
      province: 'X',
      canton: 'Y',
      educationalLevel: 'Primary',
    })
    const log = useStore.getState().auditLog
    expect(log.length).toBe(before + 1)
    expect(log[0]?.action).toBe('create')
    expect(log[0]?.entity).toBe('student')
    expect(log[0]?.entityId).toBe(created.id)
  })

  it('deleteStudent appends a delete entry and cascades', () => {
    const { id } = useStore.getState().createStudent({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
      gender: 'F',
      province: 'X',
      canton: 'Y',
      educationalLevel: 'Primary',
    })
    useStore.getState().deleteStudent(id)
    const log = useStore.getState().auditLog
    expect(log[0]?.action).toBe('delete')
    expect(log[0]?.entity).toBe('student')
    expect(log[0]?.entityId).toBe(id)
  })

  it('setGrade appends a grade entry', () => {
    const state = useStore.getState()
    const first = state.enrollments[0]
    if (!first) throw new Error('no enrollments in seed')
    useStore.getState().setGrade(first.studentId, first.courseId, 95)
    const log = useStore.getState().auditLog
    expect(log[0]?.action).toBe('grade')
    expect(log[0]?.entity).toBe('grade')
  })
})
```

### Step 14: E2E at `e2e/audit-log.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('admin sees audit log and a new create entry after making one', async ({ page }) => {
  const suffix = Date.now()
  const firstName = `Aud${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()

  // Create a fresh student to emit a log entry.
  await page.getByRole('link', { name: 'Students' }).click()
  await page.getByRole('button', { name: 'New student' }).click()
  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill('Log')
  await page.getByLabel('Email').fill(`a${suffix}@fv.cr`)
  await page.getByLabel('Province').click()
  await page.getByRole('option').first().click()
  await page.getByLabel('Canton').fill('Central')
  await page.getByRole('button', { name: 'Create student' }).click()

  // Visit Audit Logs.
  await page.getByRole('link', { name: 'Audit Logs' }).click()
  await expect(page.getByRole('heading', { name: 'Audit logs' })).toBeVisible()

  // The newly-emitted entry should appear in the top row (most-recent first).
  await expect(page.getByText(`Created student ${firstName} Log`).first()).toBeVisible()
})
```

Note: if the Students form uses a `<Select>` for Province, the `getByLabel('Province').click()` pattern above matches. If the existing form differs, adapt — read `src/pages/StudentsFormPage.tsx` first.

### Step 15: Gauntlet, commit, PR

Run the full gauntlet. Fix anything that breaks. If certificates flakes, re-run once.

Commit:

```
feat: add audit log module with live instrumentation

- AuditLogEntry + AuditAction + AuditEntity types. seedAuditLog
  builds ~37 historical entries across students, teachers,
  courses, enrollments, and grades (seeded from faker, most-
  recent first).
- SeedSnapshot + persistence validator extended. Store carries
  auditLog through initialState, resetDemo, and the debounced
  persistence.
- makeAuditEntry helper emits a structured entry. Every
  mutation on the store (create/update/delete for students,
  teachers, courses; enroll/unenroll; grade set/update/delete)
  now appends an entry to auditLog. actorId comes from
  currentUserId.
- auditLogApi.list admin-only. Filters by action and entity.
- Every existing mutation hook now invalidates ['auditLog']
  so the admin page refreshes after any change.
- AuditLogPage renders a timestamp + actor + action + entity +
  summary table with action and entity filter dropdowns.
- Route gated to admin. Nav entry added at the end of the
  sidebar.
- E2E: admin creates a student, visits Audit Logs, sees the
  create entry at the top of the list.
```

PR title: `feat: add audit log module with live instrumentation`.

Stop — do not merge.

---

## Task 3: Bulk Email module

**Branch:** `feat/bulk-email-module`

**Files:**

- Modify: `src/types/domain.ts` (add `EmailCampaign` + `EmailFilter`)
- Create: `src/data/seed/emailCampaigns.ts`
- Modify: `src/data/seed/index.ts` (include `emailCampaigns` in `SeedSnapshot`)
- Modify: `src/data/persistence.ts` (validate `emailCampaigns` in `isValidSnapshot`)
- Modify: `src/data/store.ts` (add `emailCampaigns` state + `sendEmailCampaign` action, log via audit)
- Create: `src/data/schemas/emailCampaign.ts`
- Create: `src/data/schemas/__tests__/emailCampaign.test.ts`
- Create: `src/lib/emailRecipients.ts`
- Create: `src/lib/__tests__/emailRecipients.test.ts`
- Create: `src/data/api/emailCampaigns.ts`
- Create: `src/data/__tests__/api.emailCampaigns.test.ts`
- Modify: `src/data/api/index.ts` (register `emailCampaigns: emailCampaignsApi`)
- Create: `src/hooks/api/emailCampaigns.ts`
- Modify: `src/hooks/api/index.ts` (re-export)
- Create: `src/pages/BulkEmailPage.tsx`
- Modify: `src/constants/nav.ts` (add Bulk Email entry)
- Modify: `src/App.tsx` (register route)
- Create: `e2e/bulk-email.spec.ts`

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/bulk-email-module
```

### Step 2: Types at `src/types/domain.ts`

Append:

```ts
export type EmailFilterKind = 'all' | 'program' | 'province' | 'course'

export interface EmailFilter {
  kind: EmailFilterKind
  value?: string
}

export interface EmailCampaign {
  id: string
  subject: string
  body: string
  filter: EmailFilter
  recipientIds: string[]
  sentAt: string
  sentBy: string
}
```

### Step 3: Schema at `src/data/schemas/emailCampaign.ts`

```ts
import { z } from 'zod'

export const emailCampaignSchema = z.object({
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(120),
  body: z.string().min(10, 'Body must be at least 10 characters').max(4000),
  filterKind: z.enum(['all', 'program', 'province', 'course']),
  filterValue: z.string().optional(),
})

export type EmailCampaignFormValues = z.infer<typeof emailCampaignSchema>
```

Tests at `src/data/schemas/__tests__/emailCampaign.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { emailCampaignSchema } from '../emailCampaign'

describe('emailCampaignSchema', () => {
  it('accepts a minimal valid payload', () => {
    expect(() =>
      emailCampaignSchema.parse({
        subject: 'Hello',
        body: 'This is a test message.',
        filterKind: 'all',
      })
    ).not.toThrow()
  })

  it('rejects short subject', () => {
    expect(() =>
      emailCampaignSchema.parse({
        subject: 'Hi',
        body: 'This is a test message.',
        filterKind: 'all',
      })
    ).toThrow()
  })

  it('rejects short body', () => {
    expect(() =>
      emailCampaignSchema.parse({
        subject: 'Hello',
        body: 'too short',
        filterKind: 'all',
      })
    ).toThrow()
  })
})
```

### Step 4: Recipient resolver at `src/lib/emailRecipients.ts`

```ts
import type { Course, Enrollment, Student } from '@/types'
import type { EmailFilter } from '@/types'

export interface RecipientInput {
  students: Student[]
  courses: Course[]
  enrollments: Enrollment[]
}

export function resolveRecipients(filter: EmailFilter, input: RecipientInput): Student[] {
  const { students, courses, enrollments } = input
  if (filter.kind === 'all') return students
  if (filter.kind === 'program' && filter.value) {
    const programCourseIds = new Set(
      courses.filter((c) => c.programName === filter.value).map((c) => c.id)
    )
    const enrolledStudentIds = new Set(
      enrollments.filter((e) => programCourseIds.has(e.courseId)).map((e) => e.studentId)
    )
    return students.filter((s) => enrolledStudentIds.has(s.id))
  }
  if (filter.kind === 'province' && filter.value) {
    return students.filter((s) => s.province === filter.value)
  }
  if (filter.kind === 'course' && filter.value) {
    const ids = new Set(
      enrollments.filter((e) => e.courseId === filter.value).map((e) => e.studentId)
    )
    return students.filter((s) => ids.has(s.id))
  }
  return []
}
```

Tests at `src/lib/__tests__/emailRecipients.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { resolveRecipients } from '../emailRecipients'
import type { Student, Course, Enrollment } from '@/types'

function iso() {
  return new Date().toISOString()
}

const students: Student[] = [
  {
    id: 'stu-1',
    firstName: 'A',
    lastName: 'A',
    email: 'a@fv.cr',
    gender: 'F',
    province: 'San José',
    canton: '',
    educationalLevel: 'Primary',
    enrolledCourseIds: ['cou-1'],
    createdAt: iso(),
  },
  {
    id: 'stu-2',
    firstName: 'B',
    lastName: 'B',
    email: 'b@fv.cr',
    gender: 'M',
    province: 'Heredia',
    canton: '',
    educationalLevel: 'Secondary',
    enrolledCourseIds: [],
    createdAt: iso(),
  },
]
const courses: Course[] = [
  {
    id: 'cou-1',
    name: 'Baking',
    description: '',
    headquartersName: '',
    programName: 'Culinary',
    teacherId: 'tea-1',
    createdAt: iso(),
  },
  {
    id: 'cou-2',
    name: 'Accounting',
    description: '',
    headquartersName: '',
    programName: 'Business',
    teacherId: 'tea-1',
    createdAt: iso(),
  },
]
const enrollments: Enrollment[] = [
  { id: 'enr-1', studentId: 'stu-1', courseId: 'cou-1', enrolledAt: iso() },
]

describe('resolveRecipients', () => {
  it('kind=all returns all students', () => {
    const r = resolveRecipients({ kind: 'all' }, { students, courses, enrollments })
    expect(r.map((s) => s.id).sort()).toEqual(['stu-1', 'stu-2'])
  })

  it('kind=province filters by province', () => {
    const r = resolveRecipients(
      { kind: 'province', value: 'San José' },
      { students, courses, enrollments }
    )
    expect(r.map((s) => s.id)).toEqual(['stu-1'])
  })

  it('kind=program filters by enrolled course program', () => {
    const r = resolveRecipients(
      { kind: 'program', value: 'Culinary' },
      { students, courses, enrollments }
    )
    expect(r.map((s) => s.id)).toEqual(['stu-1'])
  })

  it('kind=course filters by enrolled courseId', () => {
    const r = resolveRecipients(
      { kind: 'course', value: 'cou-1' },
      { students, courses, enrollments }
    )
    expect(r.map((s) => s.id)).toEqual(['stu-1'])
  })

  it('returns [] when value is missing for a filter that requires it', () => {
    const r = resolveRecipients({ kind: 'program' }, { students, courses, enrollments })
    expect(r).toEqual([])
  })
})
```

### Step 5: Seeder at `src/data/seed/emailCampaigns.ts`

```ts
import { faker } from '@faker-js/faker'
import type { EmailCampaign, Student } from '@/types'

export function seedEmailCampaigns(students: Student[]): EmailCampaign[] {
  faker.seed(50)
  return [
    {
      id: 'cam-1',
      subject: 'Welcome to the new term',
      body: 'Hello students — our new term begins next week. Please review the schedule and confirm your attendance.',
      filter: { kind: 'all' },
      recipientIds: students.map((s) => s.id),
      sentAt: faker.date.past({ years: 1 }).toISOString(),
      sentBy: 'admin',
    },
    {
      id: 'cam-2',
      subject: 'Culinary program: field trip',
      body: 'Culinary students — we have arranged a visit to a local bakery. Meet at HQ at 8am next Friday.',
      filter: { kind: 'program', value: 'Culinary' },
      recipientIds: students.slice(0, 4).map((s) => s.id),
      sentAt: faker.date.past({ years: 1 }).toISOString(),
      sentBy: 'admin',
    },
    {
      id: 'cam-3',
      subject: 'San José province: holiday schedule',
      body: 'Students in San José — please review the updated holiday schedule attached to the bulletin.',
      filter: { kind: 'province', value: 'San José' },
      recipientIds: students
        .filter((s) => s.province === 'San José')
        .map((s) => s.id)
        .slice(0, 6),
      sentAt: faker.date.past({ years: 1 }).toISOString(),
      sentBy: 'admin',
    },
  ]
}
```

### Step 6: Update `SeedSnapshot` at `src/data/seed/index.ts`

Replace the full file (building on the Task 2 shape):

```ts
import { seedStudents } from './students'
import { seedTeachers } from './teachers'
import { seedCourses } from './courses'
import { seedEnrollments } from './enrollments'
import { seedGrades } from './grades'
import { seedTcuActivities } from './tcuActivities'
import { seedAttendance } from './attendance'
import { seedAuditLog } from './auditLog'
import { seedEmailCampaigns } from './emailCampaigns'
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  TcuActivity,
  AttendanceRecord,
  AuditLogEntry,
  EmailCampaign,
} from '@/types'

export interface SeedSnapshot {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  tcuActivities: TcuActivity[]
  attendance: AttendanceRecord[]
  auditLog: AuditLogEntry[]
  emailCampaigns: EmailCampaign[]
}

export function buildSeedSnapshot(): SeedSnapshot {
  const teachers = seedTeachers()
  const teacherIds = teachers.map((t) => t.id)
  const courses = seedCourses(teacherIds)

  courses.forEach((c) => {
    const teacher = teachers.find((t) => t.id === c.teacherId)
    if (teacher && !teacher.courseIds.includes(c.id)) teacher.courseIds.push(c.id)
  })

  const students = seedStudents()
  const studentIds = students.map((s) => s.id)
  const courseIds = courses.map((c) => c.id)
  const enrollments = seedEnrollments(studentIds, courseIds)

  enrollments.forEach((e) => {
    const student = students.find((s) => s.id === e.studentId)
    if (student && !student.enrolledCourseIds.includes(e.courseId)) {
      student.enrolledCourseIds.push(e.courseId)
    }
  })

  const grades = seedGrades(enrollments)
  const tcuActivities = seedTcuActivities(studentIds)
  const attendance = seedAttendance(enrollments, courseIds)
  const auditLog = seedAuditLog({ students, teachers, courses, enrollments, grades })
  const emailCampaigns = seedEmailCampaigns(students)

  return {
    students,
    teachers,
    courses,
    enrollments,
    grades,
    tcuActivities,
    attendance,
    auditLog,
    emailCampaigns,
  }
}
```

### Step 7: Update persistence validator

In `src/data/persistence.ts`:

```ts
function isValidSnapshot(value: unknown): value is PersistedState {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    Array.isArray(v.students) &&
    Array.isArray(v.teachers) &&
    Array.isArray(v.courses) &&
    Array.isArray(v.enrollments) &&
    Array.isArray(v.grades) &&
    Array.isArray(v.tcuActivities) &&
    Array.isArray(v.attendance) &&
    Array.isArray(v.auditLog) &&
    Array.isArray(v.emailCampaigns)
  )
}
```

### Step 8: Extend `src/data/store.ts`

- Add `EmailCampaign`, `EmailFilter` to the `@/types` import list.
- Add `emailCampaigns: EmailCampaign[]` to `StoreState` (after `auditLog`).
- Add `sendEmailCampaign` to `StoreState`:

```ts
sendEmailCampaign: (input: {
  subject: string
  body: string
  filter: EmailFilter
  recipientIds: string[]
}) => EmailCampaign
```

- Extend `Pick<...>` in `initialState` to include `'emailCampaigns'`.
- In persisted branch, add `emailCampaigns: persisted.emailCampaigns`.
- Add `emailCampaigns: state.emailCampaigns` to the `persistSnapshot` debounce payload.
- Implementation for `sendEmailCampaign`, placed alongside other actions:

```ts
sendEmailCampaign: (input) => {
  const existing = get()
  const campaign: EmailCampaign = {
    id: nextId('cam', existing.emailCampaigns),
    subject: input.subject,
    body: input.body,
    filter: input.filter,
    recipientIds: input.recipientIds,
    sentAt: new Date().toISOString(),
    sentBy: existing.currentUserId ?? 'system',
  }
  set((state) => ({
    emailCampaigns: [campaign, ...state.emailCampaigns],
    auditLog: [
      makeAuditEntry(state, {
        action: 'create',
        entity: 'student',
        entityId: campaign.id,
        summary: `Sent email "${campaign.subject}" to ${campaign.recipientIds.length} recipients`,
      }),
      ...state.auditLog,
    ],
  }))
  return campaign
},
```

Note: the audit log's `entity` type doesn't include `'email'` in Task 2. Rather than extend the union here, reuse `'student'` with a summary that makes the intent clear. If the reviewer disagrees, Task 4 cleanup can extend the `AuditEntity` union and tighten this.

### Step 9: API at `src/data/api/emailCampaigns.ts`

```ts
import type { EmailCampaign } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

function applyRoleFilter(campaigns: EmailCampaign[]): EmailCampaign[] {
  const role = useStore.getState().role
  if (role === 'admin') return campaigns
  return []
}

export const emailCampaignsApi = {
  async list(): Promise<EmailCampaign[]> {
    await delay()
    return applyRoleFilter(useStore.getState().emailCampaigns)
  },
}
```

### Step 10: Unit tests at `src/data/__tests__/api.emailCampaigns.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { emailCampaignsApi } from '../api/emailCampaigns'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('emailCampaignsApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns seeded campaigns for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await emailCampaignsApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await emailCampaignsApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await emailCampaignsApi.list()).toEqual([])
    useStore.getState().setRole('tcu')
    expect(await emailCampaignsApi.list()).toEqual([])
  })

  it('includes newly-sent campaigns at the top', async () => {
    useStore.getState().setRole('admin')
    const before = await emailCampaignsApi.list()
    useStore.getState().sendEmailCampaign({
      subject: 'Fresh',
      body: 'Body text for the new campaign',
      filter: { kind: 'all' },
      recipientIds: ['stu-1'],
    })
    const after = await emailCampaignsApi.list()
    expect(after.length).toBe(before.length + 1)
    expect(after[0]?.subject).toBe('Fresh')
  })
})
```

Register in `src/data/api/index.ts`:

```ts
import { emailCampaignsApi } from './emailCampaigns'
// ...
export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
  enrollments: enrollmentsApi,
  grades: gradesApi,
  tcu: tcuApi,
  attendance: attendanceApi,
  auditLog: auditLogApi,
  emailCampaigns: emailCampaignsApi,
}
```

### Step 11: Hooks at `src/hooks/api/emailCampaigns.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { EmailFilter } from '@/types'

const EMAIL_CAMPAIGNS_KEY = ['emailCampaigns'] as const

export function useEmailCampaigns() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...EMAIL_CAMPAIGNS_KEY, role],
    queryFn: () => api.emailCampaigns.list(),
  })
}

export function useSendEmailCampaign() {
  const client = useQueryClient()
  const sendEmailCampaign = useStore((s) => s.sendEmailCampaign)
  return useMutation({
    mutationFn: async (input: {
      subject: string
      body: string
      filter: EmailFilter
      recipientIds: string[]
    }) => sendEmailCampaign(input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: EMAIL_CAMPAIGNS_KEY })
      client.invalidateQueries({ queryKey: ['auditLog'] })
    },
  })
}
```

Register in `src/hooks/api/index.ts`:

```ts
export * from './emailCampaigns'
```

### Step 12: Page at `src/pages/BulkEmailPage.tsx`

```tsx
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { emailCampaignSchema, type EmailCampaignFormValues } from '@/data/schemas/emailCampaign'
import { resolveRecipients } from '@/lib/emailRecipients'
import { useEmailCampaigns, useSendEmailCampaign } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { EmailFilter, EmailFilterKind } from '@/types'

export function BulkEmailPage() {
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const { data: history = [] } = useEmailCampaigns()
  const send = useSendEmailCampaign()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmailCampaignFormValues>({
    resolver: zodResolver(emailCampaignSchema),
    defaultValues: { subject: '', body: '', filterKind: 'all' },
  })

  const filterKind = watch('filterKind')
  const filterValue = watch('filterValue')

  const filter: EmailFilter = useMemo(
    () => ({ kind: filterKind, value: filterValue }),
    [filterKind, filterValue]
  )

  const recipients = useMemo(
    () => resolveRecipients(filter, { students, courses, enrollments }),
    [filter, students, courses, enrollments]
  )

  const programNames = useMemo(
    () => Array.from(new Set(courses.map((c) => c.programName))),
    [courses]
  )
  const provinceNames = useMemo(
    () => Array.from(new Set(students.map((s) => s.province))).sort(),
    [students]
  )

  async function onSubmit(values: EmailCampaignFormValues) {
    await send.mutateAsync({
      subject: values.subject,
      body: values.body,
      filter: { kind: values.filterKind, value: values.filterValue },
      recipientIds: recipients.map((s) => s.id),
    })
    reset({ subject: '', body: '', filterKind: 'all', filterValue: undefined })
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bulk email</h1>
        <p className="text-sm text-muted-foreground">
          Compose a message, pick a recipient filter, preview the count, and send.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" {...register('subject')} />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" rows={6} {...register('body')} />
              {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="filterKind">Recipient filter</Label>
                <Select
                  value={filterKind}
                  onValueChange={(v) => {
                    setValue('filterKind', v as EmailFilterKind)
                    setValue('filterValue', undefined)
                  }}
                >
                  <SelectTrigger id="filterKind">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All students</SelectItem>
                    <SelectItem value="program">By program</SelectItem>
                    <SelectItem value="province">By province</SelectItem>
                    <SelectItem value="course">By course</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filterKind !== 'all' && (
                <div className="space-y-1.5">
                  <Label htmlFor="filterValue">Value</Label>
                  <Select
                    value={filterValue ?? ''}
                    onValueChange={(v) => setValue('filterValue', v)}
                  >
                    <SelectTrigger id="filterValue">
                      <SelectValue placeholder="Pick one" />
                    </SelectTrigger>
                    <SelectContent>
                      {filterKind === 'program' &&
                        programNames.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      {filterKind === 'province' &&
                        provinceNames.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      {filterKind === 'course' &&
                        courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {recipients.length} recipient{recipients.length === 1 ? '' : 's'}.
            </p>
            <Button type="submit" disabled={isSubmitting || recipients.length === 0}>
              {isSubmitting ? 'Sending…' : 'Send'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Filter</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.subject}</TableCell>
                    <TableCell>
                      {c.filter.kind}
                      {c.filter.value ? `: ${c.filter.value}` : ''}
                    </TableCell>
                    <TableCell className="text-right">{c.recipientIds.length}</TableCell>
                    <TableCell>{new Date(c.sentAt).toLocaleDateString('en-US')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Step 13: Nav entry and route

In `src/constants/nav.ts`, add Bulk Email entry. Place it after Audit Logs (so admin-only items stay grouped at the end). Note: this branch starts from the main snapshot after Reports + Audit Logs may have landed — add it at the end. If the rebase after earlier merges reshuffles the nav, keep Bulk Email at the very end.

```ts
{ to: '/app/bulk-email', label: 'Bulk Email', roles: ['admin'] },
```

In `src/App.tsx`:

- Add `import { BulkEmailPage } from '@/pages/BulkEmailPage'`.
- Add the route inside an admin `RoleGate` block (reuse the existing one if available):

```tsx
<Route element={<RoleGate allow={['admin']} />}>
  <Route path="bulk-email" element={<BulkEmailPage />} />
</Route>
```

### Step 14: E2E at `e2e/bulk-email.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('admin sends a bulk email and sees it in the history', async ({ page }) => {
  const suffix = Date.now()
  const subject = `E2E ${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Bulk Email' }).click()
  await expect(page.getByRole('heading', { name: 'Bulk email' })).toBeVisible()

  await page.getByLabel('Subject').fill(subject)
  await page
    .getByLabel('Body')
    .fill('This is an automated test body message for the bulk email demo flow.')

  // Default filter is "All students" — recipients count should be > 0.
  await expect(page.getByText(/\d+ recipients?\./)).toBeVisible()

  await page.getByRole('button', { name: 'Send' }).click()

  // Newly-sent campaign appears in the Past campaigns table.
  await expect(page.getByRole('cell', { name: subject })).toBeVisible()
})
```

### Step 15: Gauntlet, commit, PR

Commit:

```
feat: add bulk email module with recipient filter and history

- EmailCampaign + EmailFilter types; emailCampaignSchema
  validates subject (min 3) and body (min 10) via Zod.
- resolveRecipients takes a filter (all / program / province /
  course) and returns the matching Student[]. Covered by unit
  tests on every branch.
- seedEmailCampaigns adds three historical campaigns covering
  all three filter kinds.
- SeedSnapshot + persistence validator extended. Store carries
  emailCampaigns through initialState, resetDemo, and debounced
  persistence. sendEmailCampaign action prepends a new campaign
  and emits an audit log entry.
- emailCampaignsApi.list admin-only. useEmailCampaigns +
  useSendEmailCampaign hooks; send invalidates both the
  emailCampaigns cache and the auditLog cache.
- BulkEmailPage: compose card with RHF+Zod validation, filter
  dropdowns that show the live recipient count, Send button
  disabled when the recipient list is empty. History card
  renders a table of past campaigns with filter summary and
  recipient count.
- Route gated to admin. Nav entry added after Audit Logs.
- E2E: admin composes, picks All filter, asserts recipient
  count, sends, sees subject in the history table.
```

PR title: `feat: add bulk email module with recipient filter and history`.

Stop — do not merge.

---

## Task 4: Phase 5b cleanup

**Branch:** `chore/phase-5b-cleanup`

**Scope:** whatever the final cross-cutting review finds across Tasks 1-3. Same shape as prior phase cleanups (Phase 3 PR #20, Phase 4 PR #24, Phase 5a PR #27).

- Run a final holistic review subagent once Tasks 1-3 are merged.
- For each finding rated Important or above, apply the fix.
- Full gauntlet, commit, push, PR, watch CI.
- Stop — do not merge.

If the final review finds zero actionable items, skip this Task.

One known item already surfaces in Task 3 Step 8 — the bulk-email send logs via audit with `entity: 'student'` as a shim. If cleanup review agrees, extend the `AuditEntity` union to include `'email'` and tighten the `sendEmailCampaign` audit entry.

---

## Phase 5b Exit Criteria

When Tasks 1-3 (and optionally 4) are merged:

- Admin opens Reports, sees four totals + four section tables with meaningful numbers.
- Admin opens Audit Logs, sees seeded history plus any new activity from the current session.
- Admin opens Bulk Email, composes a message with RHF+Zod validation, picks a filter, sees live recipient count, sends, and the campaign shows up in the history table.
- Sidebar nav for admin: Dashboard, Students, Teachers, Enrollments, Courses, Grades, Attendance, Reports, Certificates, TCU, Audit Logs, Bulk Email — 12 items. Other roles unchanged.
- Unit test count grows by roughly 25-30 (reports aggregates + audit log filters + recipient resolver + campaign schema + store instrumentation).
- E2E grows by 3 module tests.
- Repo at 30-31 merged PRs on `main`, all conventional-commit, no Claude attribution.

The next plan to write is **Phase 6** — i18n EN/ES across the app.

## Deferred to later phases

- Extending `AuditEntity` to include `'email'` (can land in Task 4 cleanup if the reviewer asks for it).
- Expanding Reports with per-student grade distribution, attendance trend over time, TCU program distribution.
- Pagination or virtualization for Audit Logs if entry count grows large enough to matter.
- Undo/retry on email send.
- i18n EN/ES — Phase 6.
- Marketing landing polish, README + screenshots + live demo URL, Vercel deploy, Lighthouse CI budget enforcement — Phase 7.
