# Phase 5a — TCU + Attendance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship two Tier 3 read-only modules — TCU (community service hours tracker) and Attendance (per-session course attendance) — with role-aware filters, seed data, unit + E2E coverage. No mutation paths in this phase.

**Architecture:** Follow Phase 3/4's layered shape — types → seed → store state → REST-shaped API with role filter → React Query hook → page. Both modules are list-only (no detail, no form, no delete). Role access:

- **Attendance**: admin (all), teacher (their courses), student (their own). TCU role hidden.
- **TCU**: admin (all), student (their own), tcu (activities they organized). Teacher hidden.

**Tech Stack:** React 18 · TypeScript (strict) · Vite · Zustand · @tanstack/react-query · React Router v6 · Tailwind · shadcn/ui · Vitest · Playwright.

**Phase output:** a student sees their course attendance history and the community service hours they've logged; a teacher can scan attendance for their own courses; an admin sees everything across both modules from dedicated list pages; TCU role is no longer a dead-end (they see the activities they organized).

**Workflow reminders:**

- One branch → one PR → one merge into `main` per Task.
- Start each Task by branching off a fresh `main`.
- Never `Co-Authored-By: Claude` trailers. Never "Generated with Claude Code" footers.
- Never push to `main`. Never force-push.
- Conventional commits, lowercase-first imperative (commitlint enforces this; sentence-case blocked).

**Persistence migration note:** adding `attendance` and `tcuActivities` arrays to `SeedSnapshot` changes the validator at `src/data/persistence.ts`. Existing persisted state from pre-5a will fail `isValidSnapshot` and be replaced with a fresh seeded snapshot on first load after deploy — including any demo modifications the user made. This is acceptable for a demo app with a "Reset demo" button, but should be called out in each PR body.

---

## Task 1: TCU module

**Branch:** `feat/tcu-module`

**Files:**

- Modify: `src/types/domain.ts` (add `TcuActivity`)
- Create: `src/data/seed/tcuActivities.ts`
- Modify: `src/data/seed/index.ts` (include `tcuActivities` in `SeedSnapshot`, call the new seeder)
- Modify: `src/data/persistence.ts` (validate `tcuActivities` in `isValidSnapshot`)
- Modify: `src/data/store.ts` (add `tcuActivities: TcuActivity[]` to state and initialState)
- Create: `src/data/api/tcu.ts`
- Create: `src/data/__tests__/api.tcu.test.ts`
- Modify: `src/data/api/index.ts` (register `tcu: tcuApi`)
- Create: `src/hooks/api/tcu.ts`
- Modify: `src/hooks/api/index.ts` (re-export tcu hooks)
- Create: `src/pages/TcuListPage.tsx`
- Modify: `src/constants/nav.ts` (add TCU entry)
- Modify: `src/App.tsx` (register TCU route + role gate)
- Create: `e2e/tcu.spec.ts`

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/tcu-module
```

### Step 2: Type at `src/types/domain.ts`

Append to the existing file (keep all existing types unchanged):

```ts
export interface TcuActivity {
  id: string
  studentId: string
  title: string
  description: string
  hours: number
  date: string
  organizerId?: string
}
```

### Step 3: Seeder at `src/data/seed/tcuActivities.ts`

```ts
import { faker } from '@faker-js/faker'
import type { TcuActivity } from '@/types'

const ACTIVITY_TITLES = [
  'Community library reading day',
  'Park cleanup campaign',
  'Elderly home visit',
  'School supply drive',
  'Environmental awareness workshop',
  'Food bank volunteering',
  'Youth tutoring session',
  'Public health awareness fair',
]

export function seedTcuActivities(studentIds: string[]): TcuActivity[] {
  faker.seed(47)
  const activities: TcuActivity[] = []
  let idCounter = 1
  studentIds.forEach((sid) => {
    const count = faker.number.int({ min: 1, max: 4 })
    for (let i = 0; i < count; i += 1) {
      const title = faker.helpers.arrayElement(ACTIVITY_TITLES)
      activities.push({
        id: `tcu-act-${idCounter}`,
        studentId: sid,
        title,
        description: faker.lorem.sentence({ min: 8, max: 14 }),
        hours: faker.number.int({ min: 2, max: 8 }),
        date: faker.date.past({ years: 1 }).toISOString(),
        organizerId: faker.datatype.boolean(0.7) ? 'tcu-1' : undefined,
      })
      idCounter += 1
    }
  })
  return activities
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
import type { Student, Teacher, Course, Enrollment, Grade, TcuActivity } from '@/types'

export interface SeedSnapshot {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  tcuActivities: TcuActivity[]
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
  return { students, teachers, courses, enrollments, grades, tcuActivities }
}
```

### Step 5: Update persistence validator

In `src/data/persistence.ts`, update `isValidSnapshot`:

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
    Array.isArray(v.tcuActivities)
  )
}
```

### Step 6: Update store state and initial load

In `src/data/store.ts`:

- Add `tcuActivities: TcuActivity[]` to `StoreState` interface (place after `grades: Grade[]`).
- Import `TcuActivity` alongside the other types.
- Update the `initialState` function so both the `persisted` branch and the `snapshot` branch pass `tcuActivities` through.
- Update the persisted `Pick` type on the return of `initialState` so `tcuActivities` is included.
- Update the `resetDemo` action's `set(...)` payload so it includes `tcuActivities: snapshot.tcuActivities`.
- Update the `persistSnapshot` debounce payload so it includes `tcuActivities: state.tcuActivities`.

Concrete additions:

```ts
// At the top:
import type { Student, Teacher, Course, Enrollment, Grade, TcuActivity, Role } from '@/types'

// In StoreState:
tcuActivities: TcuActivity[]

// In initialState's Pick<StoreState, ...> type — add `'tcuActivities'`:
Pick<
  StoreState,
  'students' | 'teachers' | 'courses' | 'enrollments' | 'grades' | 'tcuActivities' | 'role' | 'currentUserId'
>

// In the persisted branch return:
return {
  students: persisted.students,
  teachers: persisted.teachers,
  courses: persisted.courses,
  enrollments: persisted.enrollments,
  grades: persisted.grades,
  tcuActivities: persisted.tcuActivities,
  role,
  currentUserId,
}

// In the snapshot branch:
return { ...snapshot, role, currentUserId }  // already correct, since snapshot has tcuActivities

// In persistSnapshot:
savePersistedState({
  students: state.students,
  teachers: state.teachers,
  courses: state.courses,
  enrollments: state.enrollments,
  grades: state.grades,
  tcuActivities: state.tcuActivities,
})
```

Verify with typecheck after: `npm run typecheck` should stay green.

### Step 7: API layer at `src/data/api/tcu.ts`

```ts
import type { TcuActivity } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface TcuFilters {
  studentId?: string
  organizerId?: string
}

function applyRoleFilter(activities: TcuActivity[]): TcuActivity[] {
  const state = useStore.getState()
  const role = state.role
  if (role === 'admin') return activities
  if (role === 'student' && state.currentUserId) {
    return activities.filter((a) => a.studentId === state.currentUserId)
  }
  if (role === 'tcu' && state.currentUserId) {
    return activities.filter((a) => a.organizerId === state.currentUserId)
  }
  return []
}

function applyFilters(activities: TcuActivity[], filters: TcuFilters): TcuActivity[] {
  return activities.filter((a) => {
    if (filters.studentId && a.studentId !== filters.studentId) return false
    if (filters.organizerId && a.organizerId !== filters.organizerId) return false
    return true
  })
}

export const tcuApi = {
  async list(filters: TcuFilters = {}): Promise<TcuActivity[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().tcuActivities), filters)
  },
}
```

### Step 8: API tests at `src/data/__tests__/api.tcu.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { tcuApi } from '../api/tcu'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('tcuApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all activities for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await tcuApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns only own activities for student (stu-1)', async () => {
    useStore.getState().setRole('student')
    const result = await tcuApi.list()
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.studentId === 'stu-1')).toBe(true)
  })

  it('returns only organized activities for tcu (tcu-1)', async () => {
    useStore.getState().setRole('tcu')
    const result = await tcuApi.list()
    expect(result.every((a) => a.organizerId === 'tcu-1')).toBe(true)
  })

  it('returns empty for teacher role', async () => {
    useStore.getState().setRole('teacher')
    expect(await tcuApi.list()).toEqual([])
  })

  it('filters by studentId (admin only)', async () => {
    useStore.getState().setRole('admin')
    const all = await tcuApi.list()
    const targetStudent = all[0]?.studentId
    if (!targetStudent) throw new Error('no tcu activities in seed')
    const result = await tcuApi.list({ studentId: targetStudent })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.studentId === targetStudent)).toBe(true)
  })

  it('filters by organizerId (admin only)', async () => {
    useStore.getState().setRole('admin')
    const result = await tcuApi.list({ organizerId: 'tcu-1' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((a) => a.organizerId === 'tcu-1')).toBe(true)
  })
})
```

Register in `src/data/api/index.ts`:

```ts
import { studentsApi } from './students'
import { coursesApi } from './courses'
import { teachersApi } from './teachers'
import { enrollmentsApi } from './enrollments'
import { gradesApi } from './grades'
import { tcuApi } from './tcu'

export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
  enrollments: enrollmentsApi,
  grades: gradesApi,
  tcu: tcuApi,
}
```

### Step 9: React Query hooks at `src/hooks/api/tcu.ts`

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { TcuFilters } from '@/data/api/tcu'

const TCU_KEY = ['tcu'] as const

export function useTcuActivities(filters: TcuFilters = {}) {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...TCU_KEY, role, userId, filters],
    queryFn: () => api.tcu.list(filters),
  })
}
```

Register in `src/hooks/api/index.ts` as a new last line:

```ts
export * from './tcu'
```

Note: `userId` is included in the query key because the API's role filter reads `currentUserId`. When a demo user switches from `student` to `tcu` (or vice-versa), the query key changes and React Query refetches with the new role/user. This is a departure from Teachers/Students detail-hook patterns but correct for role-scoped views where the user identity drives filtering.

### Step 10: Page at `src/pages/TcuListPage.tsx`

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
```

### Step 11: Nav entry and route

In `src/constants/nav.ts`, add TCU as a new last entry (after Certificates):

```ts
{ to: '/app/tcu', label: 'TCU', roles: ['admin', 'student', 'tcu'] },
```

In `src/App.tsx`:

- Add the import: `import { TcuListPage } from '@/pages/TcuListPage'`.
- Add a new `RoleGate` block under the existing admin+student block for Certificates (or next to it), allowing `['admin', 'student', 'tcu']`:

```tsx
<Route element={<RoleGate allow={['admin', 'student', 'tcu']} />}>
  <Route path="tcu" element={<TcuListPage />} />
</Route>
```

### Step 12: E2E at `e2e/tcu.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('student sees only their own TCU activities', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Student' }).click()
  await page.getByRole('link', { name: 'TCU' }).click()
  await expect(page.getByRole('heading', { name: 'TCU activities' })).toBeVisible()

  // At least one row should be visible once the table renders; the Student role
  // sees only stu-1's activities, and the seeded snapshot guarantees stu-1 has
  // at least one activity.
  await expect(page.getByRole('row').nth(1)).toBeVisible()

  // The page must NOT show the student filter select (admin-only).
  await expect(page.getByRole('combobox', { name: /student/i })).toHaveCount(0)
})
```

### Step 13: Gauntlet, commit, PR

Run the full gauntlet: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run e2e`. Fix anything that breaks.

Commit:

```
feat: add tcu module (read-only community service hours)

- TcuActivity type, seed (2-4 activities per student with 70%
  attributed to tcu-1 as organizer), SeedSnapshot + persistence
  validator updated.
- Store carries tcuActivities through initialState, resetDemo,
  and the debounced persistence. Pre-5a persisted state fails
  validation and is replaced by a fresh seed snapshot on next
  load (demo app convention, Reset demo is always one click
  away).
- tcuApi.list gates by role: admin sees all, student sees their
  own, tcu sees activities they organized, teacher sees empty.
  Filters by studentId and organizerId layered on top.
- useTcuActivities query key includes role + currentUserId so
  switching roles triggers a refetch with correct scope.
- TcuListPage shows student name, title, hours, date, organizer;
  admin gets filter dropdowns, other roles get the scoped view
  only. Footer reports total hours in view.
- Route gated to admin + student + tcu via RoleGate. Nav entry
  added after Certificates.
- E2E: student enters, opens TCU, sees rows, confirms admin-only
  filter is absent.
```

PR title: `feat: add tcu module (read-only community service hours)`.

Stop — do not merge.

---

## Task 2: Attendance module

**Branch:** `feat/attendance-module`

**Files:**

- Modify: `src/types/domain.ts` (add `AttendanceStatus`, `AttendanceRecord`)
- Create: `src/data/seed/attendance.ts`
- Modify: `src/data/seed/index.ts` (include `attendance` in `SeedSnapshot`, call the new seeder)
- Modify: `src/data/persistence.ts` (validate `attendance` in `isValidSnapshot`)
- Modify: `src/data/store.ts` (add `attendance: AttendanceRecord[]` to state + persistence)
- Create: `src/data/api/attendance.ts`
- Create: `src/data/__tests__/api.attendance.test.ts`
- Modify: `src/data/api/index.ts` (register `attendance: attendanceApi`)
- Create: `src/hooks/api/attendance.ts`
- Modify: `src/hooks/api/index.ts` (re-export attendance hooks)
- Create: `src/pages/AttendanceListPage.tsx`
- Modify: `src/constants/nav.ts` (add Attendance entry)
- Modify: `src/App.tsx` (register Attendance route + role gate)
- Create: `e2e/attendance.spec.ts`

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/attendance-module
```

### Step 2: Types at `src/types/domain.ts`

Append (keep existing types unchanged):

```ts
export type AttendanceStatus = 'present' | 'absent' | 'excused'

export interface AttendanceRecord {
  id: string
  courseId: string
  studentId: string
  sessionDate: string
  status: AttendanceStatus
}
```

### Step 3: Seeder at `src/data/seed/attendance.ts`

Generate 5 session dates per course; for each enrolled student, one attendance record per session with a probability distribution (~75% present, 15% absent, 10% excused).

```ts
import { faker } from '@faker-js/faker'
import type { AttendanceRecord, AttendanceStatus, Enrollment } from '@/types'

function pickStatus(): AttendanceStatus {
  const roll = faker.number.float({ min: 0, max: 1 })
  if (roll < 0.75) return 'present'
  if (roll < 0.9) return 'absent'
  return 'excused'
}

export function seedAttendance(enrollments: Enrollment[], courseIds: string[]): AttendanceRecord[] {
  faker.seed(48)
  // Generate 5 session dates per course, sorted descending (most recent first).
  const sessionsByCourse = new Map<string, string[]>()
  courseIds.forEach((cid) => {
    const sessions = Array.from({ length: 5 }, () =>
      faker.date.recent({ days: 90 }).toISOString()
    ).sort((a, b) => (a > b ? -1 : 1))
    sessionsByCourse.set(cid, sessions)
  })

  const records: AttendanceRecord[] = []
  let idCounter = 1
  enrollments.forEach((e) => {
    const sessions = sessionsByCourse.get(e.courseId) ?? []
    sessions.forEach((sessionDate) => {
      records.push({
        id: `att-${idCounter}`,
        courseId: e.courseId,
        studentId: e.studentId,
        sessionDate,
        status: pickStatus(),
      })
      idCounter += 1
    })
  })
  return records
}
```

### Step 4: Update `SeedSnapshot` at `src/data/seed/index.ts`

Replace the full file (replacing what was set in Task 1):

```ts
import { seedStudents } from './students'
import { seedTeachers } from './teachers'
import { seedCourses } from './courses'
import { seedEnrollments } from './enrollments'
import { seedGrades } from './grades'
import { seedTcuActivities } from './tcuActivities'
import { seedAttendance } from './attendance'
import type {
  Student,
  Teacher,
  Course,
  Enrollment,
  Grade,
  TcuActivity,
  AttendanceRecord,
} from '@/types'

export interface SeedSnapshot {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  tcuActivities: TcuActivity[]
  attendance: AttendanceRecord[]
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
  return { students, teachers, courses, enrollments, grades, tcuActivities, attendance }
}
```

### Step 5: Update persistence validator

In `src/data/persistence.ts`, extend `isValidSnapshot`:

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
    Array.isArray(v.attendance)
  )
}
```

### Step 6: Update store state

In `src/data/store.ts`:

- Add `AttendanceRecord` to the `@/types` import list.
- Add `attendance: AttendanceRecord[]` to `StoreState` (after `tcuActivities`).
- Add `'attendance'` to the `Pick<StoreState, ...>` union in `initialState`'s return type.
- In the persisted branch, add `attendance: persisted.attendance` to the returned object.
- In the `persistSnapshot` payload, add `attendance: state.attendance`.

### Step 7: API at `src/data/api/attendance.ts`

```ts
import type { AttendanceRecord } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface AttendanceFilters {
  studentId?: string
  courseId?: string
  status?: AttendanceRecord['status']
}

function applyRoleFilter(records: AttendanceRecord[]): AttendanceRecord[] {
  const state = useStore.getState()
  const role = state.role
  if (role === 'admin') return records
  if (role === 'teacher' && state.currentUserId) {
    const ownedCourseIds = new Set(
      state.courses.filter((c) => c.teacherId === state.currentUserId).map((c) => c.id)
    )
    return records.filter((r) => ownedCourseIds.has(r.courseId))
  }
  if (role === 'student' && state.currentUserId) {
    return records.filter((r) => r.studentId === state.currentUserId)
  }
  return []
}

function applyFilters(records: AttendanceRecord[], filters: AttendanceFilters): AttendanceRecord[] {
  return records.filter((r) => {
    if (filters.studentId && r.studentId !== filters.studentId) return false
    if (filters.courseId && r.courseId !== filters.courseId) return false
    if (filters.status && r.status !== filters.status) return false
    return true
  })
}

export const attendanceApi = {
  async list(filters: AttendanceFilters = {}): Promise<AttendanceRecord[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().attendance), filters)
  },
}
```

### Step 8: API tests at `src/data/__tests__/api.attendance.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { attendanceApi } from '../api/attendance'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('attendanceApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all records for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await attendanceApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns only own records for student (stu-1)', async () => {
    useStore.getState().setRole('student')
    const result = await attendanceApi.list()
    expect(result.every((r) => r.studentId === 'stu-1')).toBe(true)
  })

  it('returns only records for teacher-owned courses (tea-1)', async () => {
    useStore.getState().setRole('teacher')
    const result = await attendanceApi.list()
    const state = useStore.getState()
    const ownedCourseIds = new Set(
      state.courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id)
    )
    expect(result.every((r) => ownedCourseIds.has(r.courseId))).toBe(true)
  })

  it('returns empty for tcu role', async () => {
    useStore.getState().setRole('tcu')
    expect(await attendanceApi.list()).toEqual([])
  })

  it('filters by courseId (admin)', async () => {
    useStore.getState().setRole('admin')
    const all = await attendanceApi.list()
    const targetCourse = all[0]?.courseId
    if (!targetCourse) throw new Error('no attendance records in seed')
    const result = await attendanceApi.list({ courseId: targetCourse })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.courseId === targetCourse)).toBe(true)
  })

  it('filters by status (admin)', async () => {
    useStore.getState().setRole('admin')
    const result = await attendanceApi.list({ status: 'present' })
    expect(result.length).toBeGreaterThan(0)
    expect(result.every((r) => r.status === 'present')).toBe(true)
  })
})
```

Register in `src/data/api/index.ts`:

```ts
import { attendanceApi } from './attendance'
// ...
export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
  enrollments: enrollmentsApi,
  grades: gradesApi,
  tcu: tcuApi,
  attendance: attendanceApi,
}
```

### Step 9: Hooks at `src/hooks/api/attendance.ts`

```ts
import { useQuery } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { AttendanceFilters } from '@/data/api/attendance'

const ATTENDANCE_KEY = ['attendance'] as const

export function useAttendance(filters: AttendanceFilters = {}) {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  return useQuery({
    queryKey: [...ATTENDANCE_KEY, role, userId, filters],
    queryFn: () => api.attendance.list(filters),
  })
}
```

Register in `src/hooks/api/index.ts`:

```ts
export * from './attendance'
```

### Step 10: Page at `src/pages/AttendanceListPage.tsx`

```tsx
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
```

### Step 11: Nav entry and route

In `src/constants/nav.ts`, add Attendance between Grades and TCU/Certificates. Final order:

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
```

In `src/App.tsx`:

- Add import: `import { AttendanceListPage } from '@/pages/AttendanceListPage'`.
- Add a new `RoleGate allow={['admin', 'teacher', 'student']}` block (or add to an existing one that matches these three) with:

```tsx
<Route element={<RoleGate allow={['admin', 'teacher', 'student']} />}>
  <Route path="attendance" element={<AttendanceListPage />} />
</Route>
```

### Step 12: E2E at `e2e/attendance.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('teacher sees attendance only for their own courses', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Teacher' }).click()
  await page.getByRole('link', { name: 'Attendance' }).click()
  await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()

  // Teacher role hides the student filter (admin-only).
  await expect(page.getByRole('combobox').filter({ hasText: /student/i })).toHaveCount(0)

  // At least one row renders (tea-1 owns courses with seeded enrollments).
  await expect(page.getByRole('row').nth(1)).toBeVisible()

  // Filter by status=present — rows should remain present-only.
  await page
    .getByRole('combobox')
    .filter({ hasText: /status/i })
    .click()
  await page.getByRole('option', { name: 'present' }).click()

  const presentBadges = page.getByText('present', { exact: true })
  await expect(presentBadges.first()).toBeVisible()
})
```

### Step 13: Gauntlet, commit, PR

Commit:

```
feat: add attendance module (read-only per-session records)

- AttendanceRecord + AttendanceStatus types. seedAttendance
  generates 5 session dates per course (recent 90 days) and
  assigns a status per enrolled student with ~75% present /
  15% absent / 10% excused.
- SeedSnapshot and persistence validator extended. Store carries
  attendance through initialState, resetDemo, and debounced
  persistence.
- attendanceApi.list gates by role: admin sees all, teacher
  sees only records for courses they own, student sees only
  their own, tcu sees empty. Filters by studentId, courseId,
  and status stack on top.
- useAttendance query key includes role + currentUserId so
  refetches happen cleanly on role switch.
- AttendanceListPage shows student, course, session date, and
  a status Badge (default for present, destructive for absent,
  secondary for excused). Admin gets the student filter; all
  roles see the course and status filters.
- Route gated to admin + teacher + student. Nav entry added
  between Grades and Certificates.
- E2E: teacher enters, opens Attendance, sees filtered rows,
  applies status=present filter, asserts present badge visible.
```

PR title: `feat: add attendance module (read-only per-session records)`.

Stop — do not merge.

---

## Task 3: Phase 5a cleanup

**Branch:** `chore/phase-5a-cleanup`

**Scope:** whatever the final cross-cutting review finds across Tasks 1-2. Same shape as Phase 3 PR #20 and Phase 4 PR #24.

- Run a final holistic review subagent once Tasks 1-2 are merged.
- For each finding rated Important or above, apply the fix.
- Full gauntlet, commit, push, PR, watch CI.
- Stop — do not merge.

If the final review finds zero actionable items, skip this Task.

---

## Phase 5a Exit Criteria

When Tasks 1-2 (and optionally 3) are merged:

- Admin can see every TCU activity and every attendance record across the system, with dedicated filter controls.
- Student sees only their own TCU activities and their own attendance.
- Teacher sees attendance for courses they own.
- TCU role finally has a non-dashboard page — a list of activities they organized.
- Unit test count grows by ~10-12 (6 tcu + 6 attendance).
- E2E grows by 2 module tests: student TCU scope, teacher attendance scope.
- Repo has 26-27 merged PRs on `main`, all conventional-commit, no Claude attribution.

The next plan to write is **Phase 5b** — Reports + Audit Logs + Bulk Email (the cross-cutting admin surfaces that read from everything Phase 1-5a established).

## Deferred to later phases

- Mutations on Attendance (teacher marks attendance) — Phase 6 or Phase 7.
- Mutations on TCU (admin logs activities on behalf of students) — Phase 6 or Phase 7.
- Detail-query-key consistency fix across all modules (add `role` to `useTeacher`/`useStudent` detail keys) — cross-cutting sweep.
- Certificates E2E flake investigation (UUID filename, pre-existing).
- i18n EN/ES — Phase 6.
- Marketing landing polish, README + screenshots + live demo URL, Vercel deploy, Lighthouse CI budget enforcement — Phase 7.
