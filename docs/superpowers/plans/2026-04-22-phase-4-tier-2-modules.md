# Phase 4 — Tier 2 Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship three fully-functional Tier 2 modules (Teachers, Enrollments, Grades) using the React Query + Zustand + Zod + RHF pattern established in Phase 3. Teachers get full CRUD; Enrollments and Grades get admin cross-cutting list views with delete (Enrollments) and edit + delete (Grades). Creation of enrollments and grades remains in the Courses detail page — Phase 4 adds administrative oversight, not new creation flows.

**Architecture:** Follow Phase 3's layer cake exactly — Zod schema → Zustand store action → REST-shaped `*Api` module with role filter → React Query hook → page component. Each module owns its schema, API, hooks, pages, and nav entry. Role access: Teachers is admin-only (all CRUD); Enrollments and Grades are admin-only lists. Teachers with assigned courses cannot be deleted — the UI surfaces a disabled Delete with a tooltip explaining why, and the store action throws if called directly.

**Tech Stack:** React 18 · TypeScript (strict) · Vite · Zustand · @tanstack/react-query · React Hook Form · Zod · React Router v6 · Tailwind · shadcn/ui · Vitest · Playwright.

**Phase output:** an admin can manage teachers the same way they manage students, audit every enrollment across the system, and correct or delete any grade — all from dedicated pages with filters, role-gated routes, unit + E2E coverage.

**Workflow reminders:**

- One branch → one PR → one merge into `main` per Task.
- Start each Task by branching off a fresh `main`.
- Never `Co-Authored-By: Claude` trailers. Never "Generated with Claude Code" footers.
- Never push to `main`. Never force-push.
- Conventional commits, lowercase-first imperative (commitlint enforces this; sentence-case blocked).

---

## Task 1: Teachers module

**Branch:** `feat/teachers-module`

**Files:**

- Create: `src/data/schemas/teacher.ts`
- Create: `src/data/schemas/__tests__/teacher.test.ts`
- Create: `src/data/api/teachers.ts`
- Create: `src/data/__tests__/api.teachers.test.ts`
- Create: `src/hooks/api/teachers.ts`
- Create: `src/pages/TeachersListPage.tsx`
- Create: `src/pages/TeachersDetailPage.tsx`
- Create: `src/pages/TeachersFormPage.tsx`
- Create: `src/pages/__tests__/TeachersFormPage.test.tsx`
- Create: `e2e/teachers.spec.ts`
- Modify: `src/data/store.ts` (add `createTeacher`, `updateTeacher`, `deleteTeacher`)
- Modify: `src/data/api/index.ts` (register `teachers: teachersApi`)
- Modify: `src/hooks/api/index.ts` (re-export teachers hooks)
- Modify: `src/constants/nav.ts` (add Teachers entry)
- Modify: `src/App.tsx` (register teachers routes)

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/teachers-module
```

### Step 2: Zod schema at `src/data/schemas/teacher.ts`

```ts
import { z } from 'zod'

export const teacherSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Invalid email'),
})

export type TeacherFormValues = z.infer<typeof teacherSchema>
```

Tests at `src/data/schemas/__tests__/teacher.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { teacherSchema } from '../teacher'

describe('teacherSchema', () => {
  it('accepts a valid payload', () => {
    expect(() =>
      teacherSchema.parse({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@fv.cr' })
    ).not.toThrow()
  })

  it('rejects missing first name', () => {
    expect(() => teacherSchema.parse({ firstName: '', lastName: 'X', email: 'a@b.co' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() =>
      teacherSchema.parse({ firstName: 'A', lastName: 'B', email: 'not-an-email' })
    ).toThrow()
  })
})
```

### Step 3: Extend the store with Teachers CRUD

In `src/data/store.ts`, add three methods to `StoreState`:

```ts
createTeacher: (input: Omit<Teacher, 'id' | 'createdAt' | 'courseIds'>) => Teacher
updateTeacher: (id: string, patch: Partial<Omit<Teacher, 'id'>>) => void
deleteTeacher: (id: string) => void
```

Add the implementations inside `useStore` alongside the existing Student actions. Place them after `deleteCourse` and before `enrollStudent`:

```ts
createTeacher: (input) => {
  const { teachers } = get()
  const teacher: Teacher = {
    id: nextId('tea', teachers),
    createdAt: new Date().toISOString(),
    courseIds: [],
    ...input,
  }
  set({ teachers: [...teachers, teacher] })
  return teacher
},
updateTeacher: (id, patch) => {
  set({ teachers: get().teachers.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
},
deleteTeacher: (id) => {
  const { teachers } = get()
  const target = teachers.find((t) => t.id === id)
  if (!target) return
  if (target.courseIds.length > 0) {
    throw new Error(
      `Teacher ${id} has ${target.courseIds.length} course(s) assigned — reassign before deleting.`
    )
  }
  set({ teachers: teachers.filter((t) => t.id !== id) })
},
```

Add a unit test in `src/data/__tests__/store.test.ts` (append to the existing file):

```ts
describe('teacher CRUD', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('creates a teacher with id and empty courseIds', () => {
    const created = useStore.getState().createTeacher({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@fv.cr',
    })
    expect(created.id).toMatch(/^tea-\d+$/)
    expect(created.courseIds).toEqual([])
    expect(useStore.getState().teachers.some((t) => t.id === created.id)).toBe(true)
  })

  it('updates a teacher patch', () => {
    const { id } = useStore.getState().createTeacher({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.co',
    })
    useStore.getState().updateTeacher(id, { lastName: 'Changed' })
    expect(useStore.getState().teachers.find((t) => t.id === id)?.lastName).toBe('Changed')
  })

  it('refuses to delete a teacher with assigned courses', () => {
    const tea1 = useStore.getState().teachers.find((t) => t.courseIds.length > 0)
    expect(tea1).toBeDefined()
    expect(() => useStore.getState().deleteTeacher(tea1!.id)).toThrow(/reassign/i)
    expect(useStore.getState().teachers.some((t) => t.id === tea1!.id)).toBe(true)
  })

  it('deletes a teacher with no assigned courses', () => {
    const created = useStore.getState().createTeacher({
      firstName: 'Lone',
      lastName: 'Wolf',
      email: 'lone@fv.cr',
    })
    useStore.getState().deleteTeacher(created.id)
    expect(useStore.getState().teachers.some((t) => t.id === created.id)).toBe(false)
  })
})
```

Note: the imports at the top of `store.test.ts` should already include `clearPersistedState`, `clearPersistedRole`, `clearPersistedCurrentUser`, `useStore`, `beforeEach`, `describe`, `it`, `expect`. If not, add them.

### Step 4: API layer at `src/data/api/teachers.ts`

```ts
import type { Teacher } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface TeacherFilters {
  search?: string
}

function applyRoleFilter(teachers: Teacher[]): Teacher[] {
  const role = useStore.getState().role
  if (role === 'admin') return teachers
  return []
}

function applyFilters(teachers: Teacher[], filters: TeacherFilters): Teacher[] {
  const { search } = filters
  if (!search) return teachers
  const q = search.toLowerCase()
  return teachers.filter((t) => `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(q))
}

export const teachersApi = {
  async list(filters: TeacherFilters = {}): Promise<Teacher[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().teachers), filters)
  },
  async get(id: string): Promise<Teacher | null> {
    await delay()
    const visible = applyRoleFilter(useStore.getState().teachers)
    return visible.find((t) => t.id === id) ?? null
  },
}
```

Tests at `src/data/__tests__/api.teachers.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { teachersApi } from '../api/teachers'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('teachersApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('list returns the full seed when role=admin', async () => {
    useStore.getState().setRole('admin')
    const result = await teachersApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('list returns an empty array when role is not admin', async () => {
    useStore.getState().setRole('teacher')
    expect(await teachersApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await teachersApi.list()).toEqual([])
    useStore.getState().setRole('tcu')
    expect(await teachersApi.list()).toEqual([])
  })

  it('list filters by search across first/last/email', async () => {
    useStore.getState().setRole('admin')
    const all = await teachersApi.list()
    const target = all[0]
    const bySearch = await teachersApi.list({ search: target.firstName })
    expect(bySearch.some((t) => t.id === target.id)).toBe(true)
  })

  it('get returns a teacher for admin', async () => {
    useStore.getState().setRole('admin')
    const all = await teachersApi.list()
    expect(await teachersApi.get(all[0].id)).not.toBeNull()
  })

  it('get returns null for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await teachersApi.get('tea-1')).toBeNull()
    useStore.getState().setRole('student')
    expect(await teachersApi.get('tea-1')).toBeNull()
  })
})
```

Register the API in `src/data/api/index.ts`:

```ts
import { studentsApi } from './students'
import { coursesApi } from './courses'
import { teachersApi } from './teachers'

export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
}
```

### Step 5: React Query hooks at `src/hooks/api/teachers.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { TeacherFilters } from '@/data/api/teachers'
import type { Teacher } from '@/types'

const TEACHERS_KEY = ['teachers'] as const
const teacherKey = (id: string) => ['teachers', id] as const

export function useTeachers(filters: TeacherFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...TEACHERS_KEY, role, filters],
    queryFn: () => api.teachers.list(filters),
  })
}

export function useTeacher(id: string) {
  return useQuery({
    queryKey: teacherKey(id),
    queryFn: () => api.teachers.get(id),
    enabled: id.length > 0,
  })
}

export function useCreateTeacher() {
  const client = useQueryClient()
  const createTeacher = useStore((s) => s.createTeacher)
  return useMutation({
    mutationFn: async (input: Parameters<typeof createTeacher>[0]) => {
      return createTeacher(input)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: TEACHERS_KEY })
    },
  })
}

export function useUpdateTeacher() {
  const client = useQueryClient()
  const updateTeacher = useStore((s) => s.updateTeacher)
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Teacher> }) => {
      updateTeacher(id, patch)
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: TEACHERS_KEY })
      client.invalidateQueries({ queryKey: teacherKey(id) })
    },
  })
}

export function useDeleteTeacher() {
  const client = useQueryClient()
  const deleteTeacher = useStore((s) => s.deleteTeacher)
  return useMutation({
    mutationFn: async (id: string) => {
      deleteTeacher(id)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: TEACHERS_KEY })
    },
  })
}
```

Register in `src/hooks/api/index.ts`:

```ts
export * from './students'
export * from './courses'
export * from './teachers'
```

### Step 6: Pages

`src/pages/TeachersListPage.tsx`:

```tsx
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
```

`src/pages/TeachersDetailPage.tsx`:

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTeacher } from '@/hooks/api'
import { useStore } from '@/data/store'

export function TeachersDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: teacher, isLoading } = useTeacher(id ?? '')
  const courses = useStore((s) => s.courses)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (!teacher) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Teacher not found.</p>
        <Button asChild variant="outline">
          <Link to="/app/teachers">Back to teachers</Link>
        </Button>
      </div>
    )
  }

  const assigned = courses.filter((c) => teacher.courseIds.includes(c.id))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {teacher.firstName} {teacher.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{teacher.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/teachers')}>
            Back
          </Button>
          <Button onClick={() => navigate(`/app/teachers/${teacher.id}/edit`)}>Edit</Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span> {teacher.email}
            </p>
            <p>
              <span className="text-muted-foreground">Courses assigned:</span>{' '}
              {teacher.courseIds.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {assigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">No courses assigned.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {assigned.map((c) => (
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
```

`src/pages/TeachersFormPage.tsx`:

```tsx
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { teacherSchema, type TeacherFormValues } from '@/data/schemas/teacher'
import { useCreateTeacher, useTeacher, useUpdateTeacher } from '@/hooks/api'

export function TeachersFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: existing } = useTeacher(id ?? '')
  const createTeacher = useCreateTeacher()
  const updateTeacher = useUpdateTeacher()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TeacherFormValues>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { firstName: '', lastName: '', email: '' },
  })

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
      })
    }
  }, [existing, reset])

  async function onSubmit(values: TeacherFormValues) {
    if (isEdit && id) {
      await updateTeacher.mutateAsync({ id, patch: values })
      navigate(`/app/teachers/${id}`)
    } else {
      const created = await createTeacher.mutateAsync(values)
      navigate(`/app/teachers/${created.id}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? 'Edit teacher' : 'New teacher'}
        </h1>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && (
              <p className="text-sm text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && (
              <p className="text-sm text-destructive">{errors.lastName.message}</p>
            )}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create teacher'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/app/teachers')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
```

Form unit test at `src/pages/__tests__/TeachersFormPage.test.tsx` — mirror the shape of `StudentsFormPage.test.tsx`. Cover: validation error surfaces when firstName is empty, successful submit creates a teacher. Use the existing test file as a template; replace students-specific fields with firstName/lastName/email.

### Step 7: Nav entry and routes

In `src/constants/nav.ts`, add after Students:

```ts
{ to: '/app/teachers', label: 'Teachers', roles: ['admin'] },
```

So the array reads, in order: Dashboard, Students, Teachers, Courses, Certificates.

In `src/App.tsx`, add imports:

```tsx
import { TeachersListPage } from '@/pages/TeachersListPage'
import { TeachersDetailPage } from '@/pages/TeachersDetailPage'
import { TeachersFormPage } from '@/pages/TeachersFormPage'
```

And the routes under the `admin` gate (create a new `RoleGate allow={['admin']}` block if one doesn't already exist at the layout level, otherwise add routes to the existing admin-only block):

```tsx
<Route element={<RoleGate allow={['admin']} />}>
  <Route path="teachers" element={<TeachersListPage />} />
  <Route path="teachers/new" element={<TeachersFormPage />} />
  <Route path="teachers/:id" element={<TeachersDetailPage />} />
  <Route path="teachers/:id/edit" element={<TeachersFormPage />} />
</Route>
```

### Step 8: E2E at `e2e/teachers.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('admin creates a teacher', async ({ page }) => {
  const suffix = Date.now()
  const firstName = `E2E${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Teachers' }).click()
  await expect(page.getByRole('heading', { name: 'Teachers' })).toBeVisible()

  await page.getByRole('button', { name: 'New teacher' }).click()
  await expect(page.getByRole('heading', { name: 'New teacher' })).toBeVisible()

  await page.getByLabel('First name').fill(firstName)
  await page.getByLabel('Last name').fill('Smith')
  await page.getByLabel('Email').fill(`e2e${suffix}@fv.cr`)
  await page.getByRole('button', { name: 'Create teacher' }).click()

  await expect(page.getByRole('heading', { name: `${firstName} Smith` })).toBeVisible()
})
```

### Step 9: Gauntlet, commit, PR

Run the full gauntlet (`npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run e2e`). Fix anything that breaks.

Commit:

```
feat: add teachers module with admin crud

- teacherSchema validates first/last/email via Zod.
- Store adds createTeacher, updateTeacher, deleteTeacher. Delete
  throws when the teacher still has assigned courses — the UI
  surfaces this as a disabled Delete button with a tooltip.
- teachersApi wraps the store with a role filter (admin only) and
  a search filter covering name + email.
- useTeachers/useTeacher/useCreateTeacher/useUpdateTeacher/
  useDeleteTeacher mirror the Students hook shape.
- TeachersListPage lists with search; TeachersDetailPage shows
  assigned courses; TeachersFormPage handles create and edit.
- Route gated to admin via RoleGate. Nav entry added under Teachers.
- E2E: admin creates a teacher and lands on their detail page.
```

PR title: `feat: add teachers module with admin crud`.

Stop — do not merge.

---

## Task 2: Enrollments module

**Branch:** `feat/enrollments-module`

**Scope note:** this module does NOT add a create-enrollment flow — enrollments are already created via the Courses detail page (`EnrollStudentDialog`). This module is an admin cross-cutting list + delete view. If we later decide to allow admins to enroll from this page too, that goes in a later phase.

**Files:**

- Create: `src/data/api/enrollments.ts`
- Create: `src/data/__tests__/api.enrollments.test.ts`
- Create: `src/hooks/api/enrollments.ts`
- Create: `src/pages/EnrollmentsListPage.tsx`
- Create: `e2e/enrollments.spec.ts`
- Modify: `src/data/api/index.ts`
- Modify: `src/hooks/api/index.ts`
- Modify: `src/constants/nav.ts`
- Modify: `src/App.tsx`

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/enrollments-module
```

### Step 2: API at `src/data/api/enrollments.ts`

```ts
import type { Enrollment } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface EnrollmentFilters {
  studentId?: string
  courseId?: string
}

function applyRoleFilter(enrollments: Enrollment[]): Enrollment[] {
  const role = useStore.getState().role
  if (role === 'admin') return enrollments
  return []
}

function applyFilters(enrollments: Enrollment[], filters: EnrollmentFilters): Enrollment[] {
  return enrollments.filter((e) => {
    if (filters.studentId && e.studentId !== filters.studentId) return false
    if (filters.courseId && e.courseId !== filters.courseId) return false
    return true
  })
}

export const enrollmentsApi = {
  async list(filters: EnrollmentFilters = {}): Promise<Enrollment[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().enrollments), filters)
  },
}
```

Tests at `src/data/__tests__/api.enrollments.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { enrollmentsApi } from '../api/enrollments'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('enrollmentsApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all enrollments for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await enrollmentsApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await enrollmentsApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await enrollmentsApi.list()).toEqual([])
  })

  it('filters by studentId', async () => {
    useStore.getState().setRole('admin')
    const result = await enrollmentsApi.list({ studentId: 'stu-1' })
    expect(result.every((e) => e.studentId === 'stu-1')).toBe(true)
  })

  it('filters by courseId', async () => {
    useStore.getState().setRole('admin')
    const result = await enrollmentsApi.list({ courseId: 'cou-1' })
    expect(result.every((e) => e.courseId === 'cou-1')).toBe(true)
  })
})
```

Register in `src/data/api/index.ts`:

```ts
import { enrollmentsApi } from './enrollments'
// ...
export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
  enrollments: enrollmentsApi,
}
```

### Step 3: Hooks at `src/hooks/api/enrollments.ts`

Reuses the existing store action `unenrollStudent` for deletion — no need to add a separate `deleteEnrollment` store action.

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { EnrollmentFilters } from '@/data/api/enrollments'

const ENROLLMENTS_KEY = ['enrollments'] as const

export function useEnrollments(filters: EnrollmentFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...ENROLLMENTS_KEY, role, filters],
    queryFn: () => api.enrollments.list(filters),
  })
}

export function useDeleteEnrollment() {
  const client = useQueryClient()
  const unenrollStudent = useStore((s) => s.unenrollStudent)
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      unenrollStudent(enrollmentId)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ENROLLMENTS_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
      client.invalidateQueries({ queryKey: ['courses'] })
      client.invalidateQueries({ queryKey: ['grades'] })
    },
  })
}
```

Register in `src/hooks/api/index.ts`:

```ts
export * from './students'
export * from './courses'
export * from './teachers'
export * from './enrollments'
```

### Step 4: Page at `src/pages/EnrollmentsListPage.tsx`

```tsx
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
```

### Step 5: Nav entry and route

In `src/constants/nav.ts`, add after Teachers:

```ts
{ to: '/app/enrollments', label: 'Enrollments', roles: ['admin'] },
```

In `src/App.tsx`, add the import and the route inside the `RoleGate allow={['admin']}` block:

```tsx
import { EnrollmentsListPage } from '@/pages/EnrollmentsListPage'
// ...
;<Route path="enrollments" element={<EnrollmentsListPage />} />
```

### Step 6: E2E at `e2e/enrollments.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('admin unenrolls a student from the enrollments list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Enrollments' }).click()
  await expect(page.getByRole('heading', { name: 'Enrollments' })).toBeVisible()

  page.once('dialog', (d) => d.accept())
  const initialRows = await page.getByRole('row').count()
  await page.getByRole('button', { name: 'Unenroll' }).first().click()

  await expect.poll(async () => page.getByRole('row').count()).toBeLessThan(initialRows)
})
```

### Step 7: Gauntlet, commit, PR

Commit:

```
feat: add enrollments admin list with unenroll

- enrollmentsApi lists every enrollment (admin only) with
  optional student/course filters; unit tests cover both filter
  paths plus non-admin role scoping.
- useEnrollments + useDeleteEnrollment wrap the API and reuse
  the store's existing unenrollStudent action, which also prunes
  the matching grade. Cache invalidations fan out to students,
  courses, and grades since unenrollment touches all three.
- EnrollmentsListPage renders the global enrollments table with
  student and course dropdowns. Unenroll confirms and then
  removes both the enrollment and the matching grade.
- Route gated to admin. Nav entry added.
- E2E: admin opens the list, unenrolls the first row, and the
  row count shrinks.
```

PR title: `feat: add enrollments admin list with unenroll`.

Stop — do not merge.

---

## Task 3: Grades module

**Branch:** `feat/grades-module`

**Files:**

- Create: `src/data/api/grades.ts`
- Create: `src/data/__tests__/api.grades.test.ts`
- Create: `src/hooks/api/grades.ts`
- Create: `src/pages/GradesListPage.tsx`
- Create: `src/components/grades/EditGradeDialog.tsx`
- Create: `e2e/grades.spec.ts`
- Modify: `src/data/store.ts` (add `updateGradeScore`, `deleteGrade`)
- Modify: `src/data/api/index.ts`
- Modify: `src/hooks/api/index.ts`
- Modify: `src/constants/nav.ts`
- Modify: `src/App.tsx`

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/grades-module
```

### Step 2: Extend the store

In `src/data/store.ts`, add two actions to `StoreState`:

```ts
updateGradeScore: (gradeId: string, score: number) => void
deleteGrade: (gradeId: string) => void
```

And to the `useStore` factory, alongside `setGrade`:

```ts
updateGradeScore: (gradeId, score) => {
  set((state) => ({
    grades: state.grades.map((g) =>
      g.id === gradeId ? { ...g, score, issuedAt: new Date().toISOString() } : g
    ),
  }))
},
deleteGrade: (gradeId) => {
  set((state) => ({ grades: state.grades.filter((g) => g.id !== gradeId) }))
},
```

Append to `src/data/__tests__/store.test.ts`:

```ts
describe('grade admin actions', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('updateGradeScore refreshes score and issuedAt', () => {
    const first = useStore.getState().grades[0]
    expect(first).toBeDefined()
    const originalIssuedAt = first.issuedAt
    useStore.getState().updateGradeScore(first.id, 88)
    const after = useStore.getState().grades.find((g) => g.id === first.id)!
    expect(after.score).toBe(88)
    expect(after.issuedAt).not.toBe(originalIssuedAt)
  })

  it('deleteGrade removes only the target grade', () => {
    const first = useStore.getState().grades[0]
    const before = useStore.getState().grades.length
    useStore.getState().deleteGrade(first.id)
    expect(useStore.getState().grades.length).toBe(before - 1)
    expect(useStore.getState().grades.some((g) => g.id === first.id)).toBe(false)
  })
})
```

### Step 3: API at `src/data/api/grades.ts`

```ts
import type { Grade } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface GradeFilters {
  studentId?: string
  courseId?: string
}

function applyRoleFilter(grades: Grade[]): Grade[] {
  const role = useStore.getState().role
  if (role === 'admin') return grades
  return []
}

function applyFilters(grades: Grade[], filters: GradeFilters): Grade[] {
  return grades.filter((g) => {
    if (filters.studentId && g.studentId !== filters.studentId) return false
    if (filters.courseId && g.courseId !== filters.courseId) return false
    return true
  })
}

export const gradesApi = {
  async list(filters: GradeFilters = {}): Promise<Grade[]> {
    await delay()
    return applyFilters(applyRoleFilter(useStore.getState().grades), filters)
  },
  async get(id: string): Promise<Grade | null> {
    await delay()
    const visible = applyRoleFilter(useStore.getState().grades)
    return visible.find((g) => g.id === id) ?? null
  },
}
```

Tests at `src/data/__tests__/api.grades.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { gradesApi } from '../api/grades'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('gradesApi', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('returns all grades for admin', async () => {
    useStore.getState().setRole('admin')
    const result = await gradesApi.list()
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns empty for non-admin roles', async () => {
    useStore.getState().setRole('teacher')
    expect(await gradesApi.list()).toEqual([])
    useStore.getState().setRole('student')
    expect(await gradesApi.list()).toEqual([])
    useStore.getState().setRole('tcu')
    expect(await gradesApi.list()).toEqual([])
  })

  it('filters by studentId', async () => {
    useStore.getState().setRole('admin')
    const result = await gradesApi.list({ studentId: 'stu-1' })
    expect(result.every((g) => g.studentId === 'stu-1')).toBe(true)
  })

  it('filters by courseId', async () => {
    useStore.getState().setRole('admin')
    const result = await gradesApi.list({ courseId: 'cou-1' })
    expect(result.every((g) => g.courseId === 'cou-1')).toBe(true)
  })

  it('get returns null for non-admin roles', async () => {
    useStore.getState().setRole('admin')
    const first = (await gradesApi.list())[0]
    useStore.getState().setRole('teacher')
    expect(await gradesApi.get(first.id)).toBeNull()
    useStore.getState().setRole('student')
    expect(await gradesApi.get(first.id)).toBeNull()
  })

  it('get returns the grade for admin', async () => {
    useStore.getState().setRole('admin')
    const first = (await gradesApi.list())[0]
    expect(await gradesApi.get(first.id)).not.toBeNull()
  })
})
```

Register in `src/data/api/index.ts`:

```ts
import { gradesApi } from './grades'
// ...
export const api = {
  students: studentsApi,
  courses: coursesApi,
  teachers: teachersApi,
  enrollments: enrollmentsApi,
  grades: gradesApi,
}
```

### Step 4: Hooks at `src/hooks/api/grades.ts`

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { GradeFilters } from '@/data/api/grades'

const GRADES_KEY = ['grades'] as const

export function useGrades(filters: GradeFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...GRADES_KEY, role, filters],
    queryFn: () => api.grades.list(filters),
  })
}

export function useUpdateGradeScore() {
  const client = useQueryClient()
  const updateGradeScore = useStore((s) => s.updateGradeScore)
  return useMutation({
    mutationFn: async ({ id, score }: { id: string; score: number }) => {
      updateGradeScore(id, score)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: GRADES_KEY })
    },
  })
}

export function useDeleteGrade() {
  const client = useQueryClient()
  const deleteGrade = useStore((s) => s.deleteGrade)
  return useMutation({
    mutationFn: async (id: string) => {
      deleteGrade(id)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: GRADES_KEY })
    },
  })
}
```

Register in `src/hooks/api/index.ts`:

```ts
export * from './grades'
```

### Step 5: Edit dialog at `src/components/grades/EditGradeDialog.tsx`

```tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateGradeScore } from '@/hooks/api'

interface Props {
  gradeId: string | null
  initialScore: number
  studentName: string
  courseName: string
  onClose: () => void
}

export function EditGradeDialog({
  gradeId,
  initialScore,
  studentName,
  courseName,
  onClose,
}: Props) {
  const [value, setValue] = useState(String(initialScore))
  const [error, setError] = useState<string | null>(null)
  const updateGrade = useUpdateGradeScore()

  useEffect(() => {
    setValue(String(initialScore))
    setError(null)
  }, [gradeId, initialScore])

  async function onSave() {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      setError('Score must be a number between 0 and 100.')
      return
    }
    if (!gradeId) return
    await updateGrade.mutateAsync({ id: gradeId, score: n })
    onClose()
  }

  return (
    <Dialog open={gradeId !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit grade</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {studentName} — {courseName}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="score">Score</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={updateGrade.isPending}>
            Save grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### Step 6: Page at `src/pages/GradesListPage.tsx`

```tsx
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
```

### Step 7: Nav entry and route

In `src/constants/nav.ts`, add after Enrollments:

```ts
{ to: '/app/grades', label: 'Grades', roles: ['admin'] },
```

In `src/App.tsx`:

```tsx
import { GradesListPage } from '@/pages/GradesListPage'
// ...
;<Route path="grades" element={<GradesListPage />} />
```

### Step 8: E2E at `e2e/grades.spec.ts`

```ts
import { test, expect } from '@playwright/test'

test('admin edits a grade score', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Grades' }).click()
  await expect(page.getByRole('heading', { name: 'Grades' })).toBeVisible()

  await page.getByRole('button', { name: 'Edit' }).first().click()
  await expect(page.getByRole('heading', { name: 'Edit grade' })).toBeVisible()

  await page.getByLabel('Score').fill('42')
  await page.getByRole('button', { name: 'Save grade' }).click()

  await expect(page.getByRole('heading', { name: 'Edit grade' })).toBeHidden()
  await expect(page.getByRole('cell', { name: '42' }).first()).toBeVisible()
})
```

### Step 9: Gauntlet, commit, PR

Commit:

```
feat: add grades admin list with edit and delete

- Store adds updateGradeScore and deleteGrade, covered by new
  unit tests.
- gradesApi lists every grade (admin only) with optional
  student and course filters; unit tests cover filter paths
  and non-admin role scoping.
- useGrades, useUpdateGradeScore, useDeleteGrade mirror the
  other Tier 2 hooks.
- GradesListPage renders the global grades table with student
  and course dropdown filters. EditGradeDialog validates the
  0-100 range before saving. Delete confirms before removing.
- Route gated to admin. Nav entry added.
- E2E: admin edits a grade to 42 and sees the new score in
  the table.
```

PR title: `feat: add grades admin list with edit and delete`.

Stop — do not merge.

---

## Task 4: Phase 4 cleanup

**Branch:** `chore/phase-4-cleanup`

**Scope:** whatever the final cross-cutting review finds. Same shape as Phase 3 PR #20.

- Run a final holistic review subagent once Tasks 1-3 are merged.
- For each finding rated Important or above, apply the fix.
- Full gauntlet, commit, push, PR, watch CI.
- Stop — do not merge.

If the final review finds zero actionable items, skip this Task.

---

## Phase 4 Exit Criteria

When Tasks 1-3 (and optionally 4) are merged:

- Admin can create, edit, and delete teachers (with the cascade-guard preventing deletion of teachers with assigned courses).
- Admin can audit every enrollment and unenroll any pair, with the matching grade automatically removed.
- Admin can edit or delete any grade from a global grades list with student + course filters.
- Sidebar nav shows Dashboard, Students, Teachers, Courses, Enrollments, Grades, Certificates (admin sees all; other roles still see only their Phase 3 entries).
- Unit test count grows by roughly 20+ tests (schema + store + 3 API modules).
- E2E grows by 3 module tests: teachers create, enrollment unenroll, grade edit.
- Repo has 22-23 merged PRs on `main`, all conventional-commit, no Claude attribution.

The next plan to write is **Phase 5** (Tier 3 read-only modules: Attendance, Reports, Audit Logs, TCU, Bulk Email).

## Deferred to later phases

- i18n EN/ES — Phase 6.
- Marketing landing polish, README + screenshots + live demo URL, Vercel deploy, Lighthouse CI budget enforcement — Phase 7.
- Bulk actions on Enrollments or Grades (select multiple + delete).
- Admin-initiated enrollment creation from EnrollmentsListPage (currently only possible from CoursesDetailPage).
