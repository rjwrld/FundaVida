# Phase 3 — Tier 1 Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Ship three fully-functional Tier 1 hero modules (Students, Courses, Certificates) with CRUD, role-aware access, React Query hook pattern, Zod-validated forms, unit + E2E test coverage, and a PDF-generating certificate flow — establishing the portfolio's demonstrable depth.

**Architecture:** Mutations flow through React Query hooks into the Zustand store's actions. Role-aware access uses a `currentUserId` in the store (seeded per role: admin→`'admin'`, teacher→`'tea-1'`, student→`'stu-1'`, tcu→`'tcu-1'`). Zustand's persistence subscribe is debounced (200ms) so rapid form input doesn't thrash localStorage. AppSidebar renders a role-filtered list of `NavLink`s. Certificates use `@react-pdf/renderer` entirely in-browser — no backend.

**Tech Stack:** React 18 · TypeScript (strict) · Vite · Zustand · @tanstack/react-query · React Hook Form · Zod · @react-pdf/renderer · React Router v6 · Tailwind · shadcn/ui · Vitest · Playwright.

**Phase output:** a visitor enters as Admin, creates a student, enrolls them in a course, grades the enrollment, and downloads their certificate PDF. All in-browser. All role-aware. 5 merged PRs.

**Workflow reminders:**

- One branch → one PR → one merge into `main` per Task.
- Start each Task by branching off a fresh `main`.
- Never `Co-Authored-By: Claude` trailers. Never "Generated with Claude Code" footers.
- Never push to `main`. Never force-push.
- Conventional commits, lowercase-first imperative (commitlint enforces this; sentence-case blocked).

---

## Task 1: Prep for Tier 1 modules

**Branch:** `chore/phase-3-prep`

**Files:**

- Create: `src/data/debounce.ts`
- Create: `src/hooks/useCurrentUser.ts`
- Create: `src/hooks/api/students.ts`
- Create: `src/hooks/api/courses.ts`
- Create: `src/hooks/api/index.ts`
- Create: `src/constants/nav.ts`
- Create: `src/data/__tests__/debounce.test.ts`
- Create: `src/data/__tests__/currentUser.test.ts`
- Modify: `src/data/store.ts` (add `currentUserId`, update `setRole` to set it, update `resetDemo` to clear it, debounce the subscribe)
- Modify: `src/data/persistence.ts` (add `CURRENT_USER_KEY` handling alongside role)
- Modify: `src/components/layout/AppSidebar.tsx` (role-filtered nav)

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b chore/phase-3-prep
```

### Step 2: Create `src/data/debounce.ts`

A minimal typed debounce for the subscribe callback.

```ts
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Args) => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      fn(...args)
      timer = null
    }, ms)
  }
}
```

### Step 3: Update `src/data/persistence.ts` to handle `currentUserId`

Add a third key alongside state and role. Append this near the other exports:

```ts
const CURRENT_USER_KEY = 'fundavida:v1:current-user'

export function loadPersistedCurrentUser(): string | null {
  if (!isBrowser()) return null
  return window.localStorage.getItem(CURRENT_USER_KEY)
}

export function savePersistedCurrentUser(userId: string): void {
  if (!isBrowser()) return
  window.localStorage.setItem(CURRENT_USER_KEY, userId)
}

export function clearPersistedCurrentUser(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(CURRENT_USER_KEY)
}
```

### Step 4: Update `src/data/store.ts` to add `currentUserId`, debounced subscribe, and role→user mapping

Replace the entire file:

```ts
import { create } from 'zustand'
import type { Student, Teacher, Course, Enrollment, Grade, Role } from '@/types'
import { buildSeedSnapshot } from './seed'
import { debounce } from './debounce'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  loadPersistedCurrentUser,
  loadPersistedRole,
  loadPersistedState,
  savePersistedCurrentUser,
  savePersistedRole,
  savePersistedState,
} from './persistence'

export interface StoreState {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  role: Role | null
  currentUserId: string | null
  setRole: (role: Role) => void
  resetDemo: () => void
  // Mutations (Phase 3 task 2+ add implementations)
  createStudent: (input: Omit<Student, 'id' | 'createdAt' | 'enrolledCourseIds'>) => Student
  updateStudent: (id: string, patch: Partial<Omit<Student, 'id'>>) => void
  deleteStudent: (id: string) => void
  createCourse: (input: Omit<Course, 'id' | 'createdAt'>) => Course
  updateCourse: (id: string, patch: Partial<Omit<Course, 'id'>>) => void
  deleteCourse: (id: string) => void
  enrollStudent: (studentId: string, courseId: string) => Enrollment
  unenrollStudent: (enrollmentId: string) => void
  setGrade: (studentId: string, courseId: string, score: number) => Grade
}

function userIdForRole(role: Role): string {
  switch (role) {
    case 'admin':
      return 'admin'
    case 'teacher':
      return 'tea-1'
    case 'student':
      return 'stu-1'
    case 'tcu':
      return 'tcu-1'
  }
}

function initialState(): Pick<
  StoreState,
  'students' | 'teachers' | 'courses' | 'enrollments' | 'grades' | 'role' | 'currentUserId'
> {
  const persisted = loadPersistedState()
  const role = loadPersistedRole()
  const currentUserId = loadPersistedCurrentUser()
  if (persisted) {
    return {
      students: persisted.students,
      teachers: persisted.teachers,
      courses: persisted.courses,
      enrollments: persisted.enrollments,
      grades: persisted.grades,
      role,
      currentUserId,
    }
  }
  const snapshot = buildSeedSnapshot()
  return { ...snapshot, role, currentUserId }
}

function nextId(prefix: string, existing: { id: string }[]): string {
  const nums = existing
    .map((e) => {
      const match = e.id.match(new RegExp(`^${prefix}-(\\d+)$`))
      return match?.[1] ? parseInt(match[1], 10) : 0
    })
    .filter((n) => Number.isFinite(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `${prefix}-${max + 1}`
}

export const useStore = create<StoreState>((set, get) => ({
  ...initialState(),
  setRole: (role) => {
    const userId = userIdForRole(role)
    savePersistedRole(role)
    savePersistedCurrentUser(userId)
    set({ role, currentUserId: userId })
  },
  resetDemo: () => {
    const snapshot = buildSeedSnapshot()
    set({
      ...snapshot,
      role: null,
      currentUserId: null,
    })
    savePersistedState(snapshot)
    clearPersistedRole()
    clearPersistedCurrentUser()
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem('fundavida:v1:banner-dismissed')
    }
  },
  createStudent: (input) => {
    const { students } = get()
    const student: Student = {
      id: nextId('stu', students),
      createdAt: new Date().toISOString(),
      enrolledCourseIds: [],
      ...input,
    }
    set({ students: [...students, student] })
    return student
  },
  updateStudent: (id, patch) => {
    set({ students: get().students.map((s) => (s.id === id ? { ...s, ...patch } : s)) })
  },
  deleteStudent: (id) => {
    set({
      students: get().students.filter((s) => s.id !== id),
      enrollments: get().enrollments.filter((e) => e.studentId !== id),
      grades: get().grades.filter((g) => g.studentId !== id),
    })
  },
  createCourse: (input) => {
    const { courses, teachers } = get()
    const course: Course = {
      id: nextId('cou', courses),
      createdAt: new Date().toISOString(),
      ...input,
    }
    const updatedTeachers = teachers.map((t) =>
      t.id === course.teacherId ? { ...t, courseIds: [...t.courseIds, course.id] } : t
    )
    set({ courses: [...courses, course], teachers: updatedTeachers })
    return course
  },
  updateCourse: (id, patch) => {
    set({ courses: get().courses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
  },
  deleteCourse: (id) => {
    set({
      courses: get().courses.filter((c) => c.id !== id),
      enrollments: get().enrollments.filter((e) => e.courseId !== id),
      grades: get().grades.filter((g) => g.courseId !== id),
      teachers: get().teachers.map((t) => ({
        ...t,
        courseIds: t.courseIds.filter((cid) => cid !== id),
      })),
    })
  },
  enrollStudent: (studentId, courseId) => {
    const { enrollments, students } = get()
    const existing = enrollments.find((e) => e.studentId === studentId && e.courseId === courseId)
    if (existing) return existing
    const enrollment: Enrollment = {
      id: nextId('enr', enrollments),
      studentId,
      courseId,
      enrolledAt: new Date().toISOString(),
    }
    const updatedStudents = students.map((s) =>
      s.id === studentId && !s.enrolledCourseIds.includes(courseId)
        ? { ...s, enrolledCourseIds: [...s.enrolledCourseIds, courseId] }
        : s
    )
    set({ enrollments: [...enrollments, enrollment], students: updatedStudents })
    return enrollment
  },
  unenrollStudent: (enrollmentId) => {
    const { enrollments, students, grades } = get()
    const target = enrollments.find((e) => e.id === enrollmentId)
    if (!target) return
    const updatedStudents = students.map((s) =>
      s.id === target.studentId
        ? {
            ...s,
            enrolledCourseIds: s.enrolledCourseIds.filter((cid) => cid !== target.courseId),
          }
        : s
    )
    set({
      enrollments: enrollments.filter((e) => e.id !== enrollmentId),
      grades: grades.filter(
        (g) => !(g.studentId === target.studentId && g.courseId === target.courseId)
      ),
      students: updatedStudents,
    })
  },
  setGrade: (studentId, courseId, score) => {
    const { grades } = get()
    const existing = grades.find((g) => g.studentId === studentId && g.courseId === courseId)
    if (existing) {
      const updated: Grade = { ...existing, score, issuedAt: new Date().toISOString() }
      set({ grades: grades.map((g) => (g.id === existing.id ? updated : g)) })
      return updated
    }
    const grade: Grade = {
      id: nextId('gra', grades),
      studentId,
      courseId,
      score,
      issuedAt: new Date().toISOString(),
    }
    set({ grades: [...grades, grade] })
    return grade
  },
}))

// Debounced persistence (200ms). Prevents rapid mutations (e.g. typing in
// a form) from serializing the entire snapshot on every keystroke.
const persistSnapshot = debounce((state: StoreState) => {
  savePersistedState({
    students: state.students,
    teachers: state.teachers,
    courses: state.courses,
    enrollments: state.enrollments,
    grades: state.grades,
  })
}, 200)

useStore.subscribe((state) => {
  persistSnapshot(state)
})
```

### Step 5: Create `src/hooks/useCurrentUser.ts`

```ts
import { useStore } from '@/data/store'
import type { Student, Teacher } from '@/types'

export interface CurrentUser {
  id: string
  role: 'admin' | 'teacher' | 'student' | 'tcu'
  teacher?: Teacher
  student?: Student
}

export function useCurrentUser(): CurrentUser | null {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const teacher = useStore((s) =>
    role === 'teacher' && userId ? s.teachers.find((t) => t.id === userId) : undefined
  )
  const student = useStore((s) =>
    role === 'student' && userId ? s.students.find((t) => t.id === userId) : undefined
  )
  if (!role || !userId) return null
  return { id: userId, role, teacher, student }
}
```

### Step 6: Create `src/hooks/api/students.ts`

Establishes the React Query hook pattern. Subsequent modules (courses, certificates) follow the same shape.

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { Student } from '@/types'

const STUDENTS_KEY = ['students'] as const
const studentKey = (id: string) => ['students', id] as const

export function useStudents() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...STUDENTS_KEY, role],
    queryFn: () => api.students.list(),
  })
}

export function useStudent(id: string) {
  return useQuery({
    queryKey: studentKey(id),
    queryFn: () => api.students.get(id),
  })
}

export function useCreateStudent() {
  const client = useQueryClient()
  const createStudent = useStore((s) => s.createStudent)
  return useMutation({
    mutationFn: async (input: Parameters<typeof createStudent>[0]) => {
      return createStudent(input)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: STUDENTS_KEY })
    },
  })
}

export function useUpdateStudent() {
  const client = useQueryClient()
  const updateStudent = useStore((s) => s.updateStudent)
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Student> }) => {
      updateStudent(id, patch)
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: STUDENTS_KEY })
      client.invalidateQueries({ queryKey: studentKey(id) })
    },
  })
}

export function useDeleteStudent() {
  const client = useQueryClient()
  const deleteStudent = useStore((s) => s.deleteStudent)
  return useMutation({
    mutationFn: async (id: string) => {
      deleteStudent(id)
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: STUDENTS_KEY })
    },
  })
}
```

### Step 7: Create `src/hooks/api/courses.ts`

Follows the same pattern. Full code here because Task 3 consumes these.

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/data/api'
import { useStore } from '@/data/store'
import type { Course } from '@/types'

const COURSES_KEY = ['courses'] as const
const courseKey = (id: string) => ['courses', id] as const

export function useCourses() {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...COURSES_KEY, role],
    queryFn: () => api.courses.list(),
  })
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: courseKey(id),
    queryFn: () => api.courses.get(id),
  })
}

export function useCreateCourse() {
  const client = useQueryClient()
  const createCourse = useStore((s) => s.createCourse)
  return useMutation({
    mutationFn: async (input: Parameters<typeof createCourse>[0]) => createCourse(input),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: COURSES_KEY })
    },
  })
}

export function useUpdateCourse() {
  const client = useQueryClient()
  const updateCourse = useStore((s) => s.updateCourse)
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Course> }) => {
      updateCourse(id, patch)
    },
    onSuccess: (_, { id }) => {
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: courseKey(id) })
    },
  })
}

export function useDeleteCourse() {
  const client = useQueryClient()
  const deleteCourse = useStore((s) => s.deleteCourse)
  return useMutation({
    mutationFn: async (id: string) => deleteCourse(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: COURSES_KEY })
    },
  })
}

export function useEnrollStudent() {
  const client = useQueryClient()
  const enrollStudent = useStore((s) => s.enrollStudent)
  return useMutation({
    mutationFn: async ({ studentId, courseId }: { studentId: string; courseId: string }) =>
      enrollStudent(studentId, courseId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

export function useUnenrollStudent() {
  const client = useQueryClient()
  const unenrollStudent = useStore((s) => s.unenrollStudent)
  return useMutation({
    mutationFn: async (enrollmentId: string) => unenrollStudent(enrollmentId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
    },
  })
}

export function useSetGrade() {
  const client = useQueryClient()
  const setGrade = useStore((s) => s.setGrade)
  return useMutation({
    mutationFn: async ({
      studentId,
      courseId,
      score,
    }: {
      studentId: string
      courseId: string
      score: number
    }) => setGrade(studentId, courseId, score),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: COURSES_KEY })
      client.invalidateQueries({ queryKey: ['students'] })
    },
  })
}
```

### Step 8: Create `src/hooks/api/index.ts`

```ts
export * from './students'
export * from './courses'
```

### Step 9: Create `src/constants/nav.ts`

```ts
import type { Role } from '@/types'

export interface NavItem {
  to: string
  label: string
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'tcu'] },
  { to: '/app/students', label: 'Students', roles: ['admin', 'teacher'] },
  { to: '/app/courses', label: 'Courses', roles: ['admin', 'teacher', 'student'] },
  { to: '/app/certificates', label: 'Certificates', roles: ['admin', 'student'] },
]

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
```

### Step 10: Replace `src/components/layout/AppSidebar.tsx`

```tsx
import { NavLink } from 'react-router-dom'
import { navItemsForRole } from '@/constants/nav'
import { useStore } from '@/data/store'
import { cn } from '@/lib/utils'

export function AppSidebar() {
  const role = useStore((s) => s.role)
  if (!role) return null
  const items = navItemsForRole(role)
  return (
    <aside aria-label="Sections" className="hidden w-56 shrink-0 border-r bg-muted/20 md:block">
      <nav className="p-4 text-sm">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    isActive && 'bg-muted font-medium text-foreground'
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}
```

### Step 11: Unit tests

`src/data/__tests__/debounce.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { debounce } from '../debounce'

describe('debounce', () => {
  it('invokes the callback only once after the wait window', async () => {
    vi.useFakeTimers()
    const spy = vi.fn()
    const debounced = debounce(spy, 200)
    debounced('a')
    debounced('b')
    debounced('c')
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(199)
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('c')
    vi.useRealTimers()
  })

  it('restarts the window on each call', async () => {
    vi.useFakeTimers()
    const spy = vi.fn()
    const debounced = debounce(spy, 100)
    debounced(1)
    vi.advanceTimersByTime(80)
    debounced(2)
    vi.advanceTimersByTime(80)
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    expect(spy).toHaveBeenCalledOnce()
    expect(spy).toHaveBeenCalledWith(2)
    vi.useRealTimers()
  })
})
```

`src/data/__tests__/currentUser.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedRole, clearPersistedState, clearPersistedCurrentUser } from '../persistence'

describe('currentUserId', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('is null until a role is selected', () => {
    expect(useStore.getState().currentUserId).toBeNull()
  })

  it('maps admin role to the admin sentinel', () => {
    useStore.getState().setRole('admin')
    expect(useStore.getState().currentUserId).toBe('admin')
  })

  it('maps teacher role to tea-1', () => {
    useStore.getState().setRole('teacher')
    expect(useStore.getState().currentUserId).toBe('tea-1')
  })

  it('maps student role to stu-1', () => {
    useStore.getState().setRole('student')
    expect(useStore.getState().currentUserId).toBe('stu-1')
  })

  it('resetDemo clears currentUserId', () => {
    useStore.getState().setRole('admin')
    useStore.getState().resetDemo()
    expect(useStore.getState().currentUserId).toBeNull()
  })

  it('persists currentUserId to localStorage', () => {
    useStore.getState().setRole('teacher')
    expect(window.localStorage.getItem('fundavida:v1:current-user')).toBe('tea-1')
  })
})
```

### Step 12: Update `src/data/__tests__/persistence.test.ts` to cover current-user helpers

Add these tests inside the existing `describe('persistence', ...)` block:

```ts
it('persists and loads currentUserId independently', () => {
  savePersistedCurrentUser('tea-1')
  expect(loadPersistedCurrentUser()).toBe('tea-1')
})

it('clearPersistedCurrentUser wipes only the current-user key', () => {
  savePersistedCurrentUser('tea-1')
  savePersistedRole('teacher')
  clearPersistedCurrentUser()
  expect(loadPersistedCurrentUser()).toBeNull()
  expect(loadPersistedRole()).toBe('teacher')
})
```

Update the imports at the top of the file:

```ts
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
  loadPersistedCurrentUser,
  loadPersistedRole,
  loadPersistedState,
  savePersistedCurrentUser,
  savePersistedRole,
  savePersistedState,
} from '../persistence'
```

Update the `beforeEach` to also call `clearPersistedCurrentUser()`.

### Step 13: Update other test `beforeEach` blocks to also clear currentUser

Search and update:

```bash
grep -l "clearPersistedRole" src/
```

For every file in the result (store.test.ts, api.students.test.ts, RoleSwitcher.test.tsx, RoleRequired.test.tsx), add `clearPersistedCurrentUser()` to the `beforeEach` alongside the other clears. Import it from `@/data/persistence`.

### Step 14: Sidebar unit test

Create `src/components/layout/__tests__/AppSidebar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

describe('<AppSidebar />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('renders nothing when no role is selected', () => {
    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppSidebar />
      </MemoryRouter>
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows dashboard, students, courses, certificates for admin', () => {
    useStore.getState().setRole('admin')
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppSidebar />
      </MemoryRouter>
    )
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Students' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Certificates' })).toBeInTheDocument()
  })

  it('hides students/certificates for student role', () => {
    useStore.getState().setRole('student')
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppSidebar />
      </MemoryRouter>
    )
    expect(screen.queryByRole('link', { name: 'Students' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Courses' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Certificates' })).toBeInTheDocument()
  })
})
```

The `AppLayout` test from Phase 1 uses `getByLabelText('Sections')` which still works because the aside's `aria-label` is preserved.

### Step 15: Full gauntlet

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run e2e
```

All exit 0. Unit test count grows (~36 from 29). E2E unchanged.

### Step 16: Commit and PR

```bash
git add src/
git commit -m "$(cat <<'EOF'
chore: prep tier 1 modules (current user, debounce, nav, hooks)

Lands the four scaffolding pieces the Tier 1 modules build on:

- Add currentUserId to the store, derived from the selected role
  (admin -> 'admin', teacher -> 'tea-1', student -> 'stu-1',
  tcu -> 'tcu-1'). Persisted to localStorage under
  fundavida:v1:current-user. Cleared by resetDemo.
- Debounce the Zustand persistence subscribe (200ms) via a new
  src/data/debounce.ts helper so rapid CRUD mutations (typing in
  a form) don't serialize the full snapshot on every keystroke.
- Introduce src/hooks/api/{students,courses}.ts — the React Query
  hook pattern every Tier 1 module consumes. useStudents/useStudent
  for reads; useCreateStudent/useUpdateStudent/useDeleteStudent and
  useCreateCourse/useUpdateCourse/useDeleteCourse/useEnrollStudent/
  useUnenrollStudent/useSetGrade for mutations. All mutations
  invalidate the relevant query keys.
- Data-driven AppSidebar: src/constants/nav.ts exports NAV_ITEMS
  with per-item role allowlists; the sidebar filters by current
  role. Uses <NavLink> for active-state highlighting.
- Store gains CRUD actions (createStudent, updateStudent,
  deleteStudent, createCourse, updateCourse, deleteCourse,
  enrollStudent, unenrollStudent, setGrade) — implementations ready
  for Tasks 2-4 to consume.
- useCurrentUser hook resolves the current user's teacher/student
  record when the role has one; returns null when no role is set.
- New tests: debounce edges, currentUserId persistence and resets,
  sidebar role filtering.
EOF
)"
git push -u origin chore/phase-3-prep
gh pr create --base main --head chore/phase-3-prep --title "chore: prep tier 1 modules" --body "$(cat <<'EOF'
## Summary

Scaffolds the four pieces the Tier 1 modules (Students, Courses, Certificates) need: current-user concept, debounced persistence, data-driven sidebar, and React Query hooks.

## Changes

- \`src/data/debounce.ts\` + 200ms-debounced subscribe in \`store.ts\`.
- \`currentUserId\` in store, derived from role, persisted under \`fundavida:v1:current-user\`.
- \`src/hooks/api/\` — React Query hooks for students and courses (reads + mutations).
- \`src/hooks/useCurrentUser.ts\` — resolves the current teacher/student record.
- \`src/constants/nav.ts\` + role-filtered \`AppSidebar\`.
- Store gains CRUD actions consumed by Phase 3 Tasks 2-4.
- Tests: debounce, currentUserId, sidebar role filtering; persistence tests extended for the new key.

## Test plan

- [x] \`npm run typecheck\` passes
- [x] \`npm run lint\` passes
- [x] \`npm run format:check\` passes
- [x] \`npm test\` passes with expanded counts
- [x] \`npm run build\` passes
- [x] \`npm run e2e\` — 3 smoke tests pass
EOF
)"
gh pr checks $(gh pr view --json number -q .number) --watch 2>&1 | head -40
```

Both CI jobs must go green.

### Step 17: Stop — do not merge

---

## Task 2: Students module

**Branch:** `feat/students-module`

**Key pieces:**

- API: extend `studentsApi` with `listFiltered({ search, province, level })` (server-side-style filtering).
- Pages: `StudentsListPage` (search + filter + sort + table), `StudentsDetailPage` (profile + enrollment list), `StudentsFormPage` (create + edit).
- Form: React Hook Form + Zod schema (`src/data/schemas/student.ts`).
- Confirm dialog for delete.
- Tests: schema validation, form submission, list filtering, delete confirmation.
- E2E: admin creates a student, opens the detail page, verifies it's enrolled in 0 courses.

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/students-module
```

### Step 2: Extend `src/data/api/students.ts` with filters and CRUD

Replace the file:

```ts
import type { Student } from '@/types'
import { useStore } from '../store'
import { delay } from './_delay'

export interface StudentFilters {
  search?: string
  province?: string
  educationalLevel?: string
}

function applyRoleFilter(students: Student[]): Student[] {
  const role = useStore.getState().role
  if (role === 'admin' || role === 'teacher') return students
  return []
}

function applyFilters(students: Student[], filters: StudentFilters): Student[] {
  const { search, province, educationalLevel } = filters
  return students.filter((s) => {
    if (
      search &&
      !`${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(search.toLowerCase())
    ) {
      return false
    }
    if (province && s.province !== province) return false
    if (educationalLevel && s.educationalLevel !== educationalLevel) return false
    return true
  })
}

export const studentsApi = {
  async list(filters: StudentFilters = {}): Promise<Student[]> {
    await delay()
    const students = useStore.getState().students
    return applyFilters(applyRoleFilter(students), filters)
  },
  async get(id: string): Promise<Student | null> {
    await delay()
    const students = useStore.getState().students
    return students.find((s) => s.id === id) ?? null
  },
}
```

Update the matching `useStudents` hook to accept filters:

```ts
// In src/hooks/api/students.ts, replace useStudents:
import type { StudentFilters } from '@/data/api/students'

export function useStudents(filters: StudentFilters = {}) {
  const role = useStore((s) => s.role)
  return useQuery({
    queryKey: [...STUDENTS_KEY, role, filters],
    queryFn: () => api.students.list(filters),
  })
}
```

### Step 3: Create Zod schema `src/data/schemas/student.ts`

```ts
import { z } from 'zod'

export const studentSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(80),
  lastName: z.string().min(1, 'Last name is required').max(80),
  email: z.string().email('Invalid email'),
  gender: z.enum(['F', 'M', 'X']),
  province: z.string().min(1, 'Province is required'),
  canton: z.string().min(1, 'Canton is required'),
  educationalLevel: z.enum(['Primary', 'Secondary', 'University']),
})

export type StudentFormValues = z.infer<typeof studentSchema>
```

Install Zod and React Hook Form:

```bash
npm install zod@^3.23.8 react-hook-form@^7.53.0 @hookform/resolvers@^3.9.0
```

### Step 4: Install shadcn primitives used by the forms

```bash
npx shadcn@latest add input label select textarea dialog table form badge
```

Verify each was added under `src/components/ui/`.

### Step 5: Create `src/pages/StudentsListPage.tsx`

```tsx
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

const PROVINCES = ['San José', 'Heredia', 'Alajuela', 'Cartago']
const LEVELS = ['Primary', 'Secondary', 'University']

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
            {LEVELS.map((l) => (
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
```

### Step 6: Create `src/pages/StudentsDetailPage.tsx`

```tsx
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStudent } from '@/hooks/api'
import { useStore } from '@/data/store'

export function StudentsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: student, isLoading } = useStudent(id ?? '')
  const courses = useStore((s) => s.courses)

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (!student) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Student not found.</p>
        <Button asChild variant="outline">
          <Link to="/app/students">Back to students</Link>
        </Button>
      </div>
    )
  }

  const enrolledCourses = courses.filter((c) => student.enrolledCourseIds.includes(c.id))

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">{student.email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/students')}>
            Back
          </Button>
          <Button onClick={() => navigate(`/app/students/${student.id}/edit`)}>Edit</Button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Province:</span> {student.province}
            </p>
            <p>
              <span className="text-muted-foreground">Canton:</span> {student.canton}
            </p>
            <p>
              <span className="text-muted-foreground">Level:</span> {student.educationalLevel}
            </p>
            <p>
              <span className="text-muted-foreground">Gender:</span> {student.gender}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledCourses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Not enrolled in any courses.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {enrolledCourses.map((c) => (
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

### Step 7: Create `src/pages/StudentsFormPage.tsx`

Handles both create and edit paths. URL `/app/students/new` → create; `/app/students/:id/edit` → edit.

```tsx
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { studentSchema, type StudentFormValues } from '@/data/schemas/student'
import { useCreateStudent, useStudent, useUpdateStudent } from '@/hooks/api'

const PROVINCES = ['San José', 'Heredia', 'Alajuela', 'Cartago']
const LEVELS = ['Primary', 'Secondary', 'University'] as const
const GENDERS = ['F', 'M', 'X'] as const

export function StudentsFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: existing } = useStudent(id ?? '')
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      gender: 'F',
      province: '',
      canton: '',
      educationalLevel: 'Primary',
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        gender: existing.gender,
        province: existing.province,
        canton: existing.canton,
        educationalLevel: existing.educationalLevel as StudentFormValues['educationalLevel'],
      })
    }
  }, [existing, reset])

  async function onSubmit(values: StudentFormValues) {
    if (isEdit && id) {
      await updateStudent.mutateAsync({ id, patch: values })
      navigate(`/app/students/${id}`)
    } else {
      const created = await createStudent.mutateAsync(values)
      navigate(`/app/students/${created.id}`)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isEdit ? 'Edit student' : 'New student'}
        </h1>
      </header>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select
              value={watch('gender')}
              onValueChange={(v) => setValue('gender', v as StudentFormValues['gender'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Province</Label>
            <Select value={watch('province')} onValueChange={(v) => setValue('province', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.province && (
              <p className="text-xs text-destructive">{errors.province.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="canton">Canton</Label>
            <Input id="canton" {...register('canton')} />
            {errors.canton && <p className="text-xs text-destructive">{errors.canton.message}</p>}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Educational level</Label>
          <Select
            value={watch('educationalLevel')}
            onValueChange={(v) =>
              setValue('educationalLevel', v as StudentFormValues['educationalLevel'])
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEVELS.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate('/app/students')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
```

### Step 8: Wire routes in `src/App.tsx`

Add the three Students routes under the protected `AppLayout`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { StudentsListPage } from '@/pages/StudentsListPage'
import { StudentsDetailPage } from '@/pages/StudentsDetailPage'
import { StudentsFormPage } from '@/pages/StudentsFormPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RoleRequired } from '@/components/demo/RoleRequired'

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route element={<RoleRequired />}>
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="students" element={<StudentsListPage />} />
            <Route path="students/new" element={<StudentsFormPage />} />
            <Route path="students/:id" element={<StudentsDetailPage />} />
            <Route path="students/:id/edit" element={<StudentsFormPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

### Step 9: Tests

`src/data/schemas/__tests__/student.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { studentSchema } from '../student'

describe('studentSchema', () => {
  const valid = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    gender: 'F' as const,
    province: 'San José',
    canton: 'Central',
    educationalLevel: 'University' as const,
  }

  it('accepts a valid student', () => {
    expect(studentSchema.parse(valid)).toEqual(valid)
  })

  it('rejects empty names', () => {
    expect(() => studentSchema.parse({ ...valid, firstName: '' })).toThrow()
  })

  it('rejects invalid email', () => {
    expect(() => studentSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })

  it('rejects unknown educational levels', () => {
    expect(() => studentSchema.parse({ ...valid, educationalLevel: 'Unknown' as never })).toThrow()
  })
})
```

Add a CRUD test in `src/data/__tests__/api.students.test.ts` by appending:

```ts
it('listFiltered applies the search filter on name + email', async () => {
  useStore.getState().setRole('admin')
  const all = await api.students.list()
  const first = all[0]
  if (!first) throw new Error('no students in seed')
  const targeted = await api.students.list({ search: first.firstName })
  expect(targeted.some((s) => s.id === first.id)).toBe(true)
})

it('listFiltered applies province filter', async () => {
  useStore.getState().setRole('admin')
  const result = await api.students.list({ province: 'San José' })
  expect(result.every((s) => s.province === 'San José')).toBe(true)
})
```

Create `src/pages/__tests__/StudentsFormPage.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StudentsFormPage } from '@/pages/StudentsFormPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderForm(path = '/app/students/new') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/app/students" element={<div>students list</div>} />
          <Route path="/app/students/new" element={<StudentsFormPage />} />
          <Route path="/app/students/:id" element={<div>student detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('<StudentsFormPage />', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
  })

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
  })

  it('creates a student and lands on their detail page', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lovelace')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Canton'), 'Central')
    // Select triggers require opening the dropdown and clicking an item.
    // The defaults (F, Primary) plus a chosen province complete the form.
    await user.click(screen.getByRole('combobox', { name: /province/i }))
    await user.click(screen.getByRole('option', { name: 'San José' }))
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('student detail')).toBeInTheDocument()
    const added = useStore.getState().students.find((s) => s.email === 'ada@example.com')
    expect(added).toBeDefined()
  })
})
```

### Step 10: E2E — hero flow (enroll)

Add to `e2e/smoke.spec.ts` (or create `e2e/students.spec.ts` — choose whichever keeps smoke focused; preferred: separate file):

Create `e2e/students.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('admin creates a student and sees them in the list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Students' }).click()
  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible()

  await page.getByRole('button', { name: 'New student' }).click()
  await expect(page.getByRole('heading', { name: 'New student' })).toBeVisible()

  await page.getByLabel('First name').fill('Ada')
  await page.getByLabel('Last name').fill('Lovelace')
  await page.getByLabel('Email').fill('ada+e2e@example.com')
  await page.getByLabel('Canton').fill('Central')

  // Province select
  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()

  await page.getByRole('button', { name: 'Create' }).click()

  // Lands on detail page
  await expect(page.getByRole('heading', { name: 'Ada Lovelace' })).toBeVisible()
  await expect(page.getByText('ada+e2e@example.com')).toBeVisible()

  // Back to list, verify the new student appears
  await page.getByRole('link', { name: 'Back' }).click()
  await page.getByRole('link', { name: 'Students' }).click()
  await page.getByPlaceholder('Search by name or email').fill('Ada')
  await expect(page.getByText('Ada Lovelace')).toBeVisible()
})
```

### Step 11: Role guards on `/app/students/*`

Add an inline role check to the Students pages — redirect teachers/students/tcus that deep-link to students routes. Simplest shared helper: create `src/components/demo/RoleGate.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '@/data/store'
import type { Role } from '@/types'

export function RoleGate({ allow }: { allow: Role[] }) {
  const role = useStore((s) => s.role)
  if (!role || !allow.includes(role)) return <Navigate to="/app" replace />
  return <Outlet />
}
```

Update `App.tsx` to wrap the students routes:

```tsx
<Route element={<RoleGate allow={['admin', 'teacher']} />}>
  <Route path="students" element={<StudentsListPage />} />
  <Route path="students/new" element={<StudentsFormPage />} />
  <Route path="students/:id" element={<StudentsDetailPage />} />
  <Route path="students/:id/edit" element={<StudentsFormPage />} />
</Route>
```

Teachers hitting `/app/students` will see the list (allowed); students/tcus get redirected to `/app`.

### Step 12: Full gauntlet, commit, PR

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run e2e
```

```bash
git add src/ e2e/ package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add students module (list, detail, form, CRUD)

Ships the first Tier 1 module end to end:

- StudentsListPage with search + province + level filters, create
  button, edit/delete actions.
- StudentsDetailPage with profile + enrollments card.
- StudentsFormPage handling both create and edit paths with react-
  hook-form + zod validation.
- studentsApi gains filters (search/province/educationalLevel).
- useStudents hook accepts filters; new StudentsFormPage uses the
  create/update mutations from Phase 3 prep.
- src/data/schemas/student.ts is the single Zod source of truth.
- src/components/demo/RoleGate.tsx protects admin/teacher-only
  routes; students and tcus get redirected to /app.
- New shadcn primitives (Input, Label, Select, Table, Dialog, Form,
  Textarea, Badge) installed.
- Unit tests: studentSchema validation, api filter application,
  StudentsFormPage validation and create flow.
- E2E: admin creates a student end-to-end, verifies the detail
  page and the list row.
EOF
)"
git push -u origin feat/students-module
gh pr create --base main --head feat/students-module --title "feat: add students module" --body "$(cat <<'EOF'
## Summary

Ships the first Tier 1 hero module: full students CRUD with search/filter, detail page, create/edit form with Zod validation, role-gated routing, and a Playwright hero-flow test.

## Changes

- \`src/pages/{StudentsListPage,StudentsDetailPage,StudentsFormPage}.tsx\`
- \`src/data/schemas/student.ts\` + validation tests
- \`src/data/api/students.ts\` gains filter support
- \`src/hooks/api/students.ts\` \`useStudents\` accepts filters
- \`src/components/demo/RoleGate.tsx\` for allowlist role guards
- shadcn primitives: input, label, select, table, dialog, form, textarea, badge
- \`e2e/students.spec.ts\` hero flow

## Test plan

- [x] typecheck, lint, format:check all pass
- [x] \`npm test\` passes with new schema + page tests
- [x] \`npm run e2e\` — 4 tests (3 smoke + 1 students hero)
- [x] Build passes
EOF
)"
gh pr checks $(gh pr view --json number -q .number) --watch 2>&1 | head -40
```

### Step 13: Stop — do not merge

---

## Task 3: Courses module + enrollments + grading

**Branch:** `feat/courses-module`

**Pattern:** follows Students (from Task 2). Same three-page shape (list, detail, form) plus an enrollments widget on detail and a grading dialog for teachers.

**Key differences from Students:**

- CoursesDetailPage shows enrolled students with inline "Grade" buttons (opens a Dialog).
- Teacher role sees only their own courses; the API already filters by `teacherId === currentUserId`.
- Updating the `applyRoleFilter` in `courses.ts` to use `currentUserId` (not `'tea-1'`) is done in this Task — the stand-in from Phase 2 goes away.
- The grading Dialog uses React Hook Form + a Zod schema (score: number between 0 and 100).

**Files:**

- Create: `src/pages/CoursesListPage.tsx`
- Create: `src/pages/CoursesDetailPage.tsx`
- Create: `src/pages/CoursesFormPage.tsx`
- Create: `src/components/courses/GradeDialog.tsx`
- Create: `src/components/courses/EnrollStudentDialog.tsx`
- Create: `src/data/schemas/course.ts` (courseSchema), `src/data/schemas/grade.ts` (gradeSchema)
- Create: `src/pages/__tests__/CoursesFormPage.test.tsx`
- Create: `src/data/schemas/__tests__/course.test.ts`
- Create: `e2e/courses.spec.ts` — teacher grades a student hero flow
- Modify: `src/data/api/courses.ts` — use `currentUserId` from store for teacher filter
- Modify: `src/App.tsx` — add course routes under a `RoleGate allow={['admin', 'teacher', 'student']}`

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/courses-module
```

### Step 2: Update `src/data/api/courses.ts` to use `currentUserId`

Replace the `applyRoleFilter` body:

```ts
function applyRoleFilter(courses: Course[]): Course[] {
  const state = useStore.getState()
  const role = state.role
  if (role === 'admin') return courses
  if (role === 'teacher' && state.currentUserId) {
    return courses.filter((c) => c.teacherId === state.currentUserId)
  }
  if (role === 'student' && state.currentUserId) {
    const enrollments = state.enrollments.filter((e) => e.studentId === state.currentUserId)
    const courseIds = new Set(enrollments.map((e) => e.courseId))
    return courses.filter((c) => courseIds.has(c.id))
  }
  return []
}
```

Now students see the courses they're enrolled in; teachers see only theirs; admin sees all.

### Step 3: Zod schemas

`src/data/schemas/course.ts`:

```ts
import { z } from 'zod'

export const courseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  description: z.string().min(1, 'Description is required').max(500),
  headquartersName: z.string().min(1, 'Headquarters is required'),
  programName: z.string().min(1, 'Program is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
})

export type CourseFormValues = z.infer<typeof courseSchema>
```

`src/data/schemas/grade.ts`:

```ts
import { z } from 'zod'

export const gradeSchema = z.object({
  score: z
    .number({ invalid_type_error: 'Score must be a number' })
    .min(0, 'Min 0')
    .max(100, 'Max 100'),
})

export type GradeFormValues = z.infer<typeof gradeSchema>
```

### Step 4: Create the four Courses pages + dialogs

Each follows the pattern established in Task 2. Use CoursesListPage mirroring StudentsListPage (search + HQ + program filters), CoursesFormPage mirroring StudentsFormPage (RHF + Zod, teacher select), and CoursesDetailPage including:

1. Course metadata card (name, description, HQ, program, teacher).
2. Enrolled students list with inline "Grade" button per row (opens GradeDialog for teachers/admins only).
3. "Enroll student" button (admin only) that opens EnrollStudentDialog to pick from the not-yet-enrolled students.

`src/components/courses/GradeDialog.tsx`:

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSetGrade } from '@/hooks/api'
import { gradeSchema, type GradeFormValues } from '@/data/schemas/grade'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  studentId: string
  courseId: string
  studentName: string
  initialScore?: number
}

export function GradeDialog({
  open,
  onOpenChange,
  studentId,
  courseId,
  studentName,
  initialScore,
}: Props) {
  const setGrade = useSetGrade()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GradeFormValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { score: initialScore ?? 0 },
  })

  async function onSubmit(values: GradeFormValues) {
    await setGrade.mutateAsync({ studentId, courseId, score: values.score })
    reset({ score: values.score })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Grade {studentName}</DialogTitle>
          <DialogDescription>Enter a score between 0 and 100.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="score">Score</Label>
            <Input
              id="score"
              type="number"
              min={0}
              max={100}
              step={1}
              {...register('score', { valueAsNumber: true })}
            />
            {errors.score && <p className="text-xs text-destructive">{errors.score.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Save grade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

`src/components/courses/EnrollStudentDialog.tsx`:

```tsx
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useStore } from '@/data/store'
import { useEnrollStudent } from '@/hooks/api'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  courseId: string
}

export function EnrollStudentDialog({ open, onOpenChange, courseId }: Props) {
  const students = useStore((s) => s.students)
  const enrollments = useStore((s) => s.enrollments)
  const enrolledIds = new Set(
    enrollments.filter((e) => e.courseId === courseId).map((e) => e.studentId)
  )
  const eligible = students.filter((s) => !enrolledIds.has(s.id))
  const [selected, setSelected] = useState<string>('')
  const enroll = useEnrollStudent()

  async function submit() {
    if (!selected) return
    await enroll.mutateAsync({ studentId: selected, courseId })
    setSelected('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enroll a student</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>Student</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger>
              <SelectValue placeholder="Select a student" />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {eligible.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Every student is already enrolled in this course.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={!selected}>
            Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**CoursesListPage**: copy the StudentsListPage shape, adapting columns to `Name | Program | HQ | Teacher | Actions`. Filters: search, headquarters, program. Admin+teacher see their allowed subset; student sees their enrolled courses.

**CoursesFormPage**: copy StudentsFormPage shape. Fields: name, description, headquartersName, programName, teacherId (Select populated from `useStore((s) => s.teachers)`). Admin-only in `RoleGate`.

**CoursesDetailPage**: header with metadata card, then a "Enrolled students" card with a table: name | grade (or "Not graded") | action (Grade button for admin/teacher, Remove button for admin). A `useState` for the selected grading target drives `<GradeDialog />`. An "Enroll student" button opens `<EnrollStudentDialog />` (admin only).

### Step 5: Tests

`src/data/schemas/__tests__/course.test.ts`: two tests (valid parse, rejects empty name). Pattern mirrors `student.test.ts`.

`src/data/schemas/__tests__/grade.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { gradeSchema } from '../grade'

describe('gradeSchema', () => {
  it('accepts scores 0 and 100', () => {
    expect(gradeSchema.parse({ score: 0 }).score).toBe(0)
    expect(gradeSchema.parse({ score: 100 }).score).toBe(100)
  })

  it('rejects negative and out-of-range', () => {
    expect(() => gradeSchema.parse({ score: -1 })).toThrow()
    expect(() => gradeSchema.parse({ score: 101 })).toThrow()
  })
})
```

`src/pages/__tests__/CoursesFormPage.test.tsx`: mirror `StudentsFormPage.test.tsx` — validation + create flow.

`src/data/__tests__/api.courses.test.ts` (new file):

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '../api'
import { useStore } from '../store'
import { clearPersistedCurrentUser, clearPersistedRole, clearPersistedState } from '../persistence'

describe('api.courses role filter', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
  })

  it('admin sees all courses', async () => {
    useStore.getState().setRole('admin')
    const list = await api.courses.list()
    expect(list.length).toBe(useStore.getState().courses.length)
  })

  it('teacher sees only their own', async () => {
    useStore.getState().setRole('teacher')
    const list = await api.courses.list()
    expect(list.every((c) => c.teacherId === 'tea-1')).toBe(true)
  })

  it('student sees only enrolled courses', async () => {
    useStore.getState().setRole('student')
    const list = await api.courses.list()
    const enrolledIds = useStore
      .getState()
      .enrollments.filter((e) => e.studentId === 'stu-1')
      .map((e) => e.courseId)
    expect(list.every((c) => enrolledIds.includes(c.id))).toBe(true)
  })
})
```

### Step 6: E2E — hero flow (teacher grades)

`e2e/courses.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('teacher grades a student in their course', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Teacher' }).click()
  await page.getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()

  // Open the first course row
  await page.getByRole('link').filter({ hasText: /\d+$/ }).first().click()

  // Pick the first student and click Grade
  await page.getByRole('button', { name: 'Grade' }).first().click()
  await expect(page.getByRole('heading', { name: /^Grade / })).toBeVisible()

  await page.getByLabel('Score').fill('92')
  await page.getByRole('button', { name: 'Save grade' }).click()

  // Grade now appears in the row
  await expect(page.getByText('92')).toBeVisible()
})
```

### Step 7: App.tsx route updates

Add course routes mirrored from students:

```tsx
<Route element={<RoleGate allow={['admin', 'teacher', 'student']} />}>
  <Route path="courses" element={<CoursesListPage />} />
  <Route path="courses/:id" element={<CoursesDetailPage />} />
</Route>
<Route element={<RoleGate allow={['admin']} />}>
  <Route path="courses/new" element={<CoursesFormPage />} />
  <Route path="courses/:id/edit" element={<CoursesFormPage />} />
</Route>
```

### Step 8: Gauntlet, commit, PR

Same shape as Task 2 — typecheck, lint, format:check, test, build, e2e. Commit message:

```
feat: add courses module with enrollments and grading

- CoursesListPage with search + hq + program filters.
- CoursesDetailPage with enrollment management and inline grading
  via GradeDialog (teacher/admin) and EnrollStudentDialog (admin).
- CoursesFormPage create/edit with zod-validated form.
- api.courses filter now uses currentUserId (removing the tea-1
  stand-in from Phase 2). Student role sees their enrolled courses.
- Grade schema at src/data/schemas/grade.ts (0-100 integer).
- Unit tests: schemas, api filters by role, form validation.
- E2E: teacher grades a student in their course (hero flow).
```

PR title: `feat: add courses module with enrollments and grading`.

Stop — do not merge.

---

## Task 4: Certificates module (PDF generation)

**Branch:** `feat/certificates-module`

**Key pieces:**

- Eligibility rule: student has at least one grade in a course with score >= 70.
- CertificatesListPage shows eligible {student, course, grade} tuples.
- Click → preview modal with `@react-pdf/renderer`'s `<PDFViewer />` and Download button that writes the PDF blob.
- `@react-pdf/renderer` components live in `src/lib/pdf/CertificateTemplate.tsx`.
- Role access: admin sees every eligible certificate; student sees only their own; tcu and teacher hidden from nav (already configured in Task 1 constants).
- E2E: admin selects an eligible student, clicks Download, asserts a download event fires.

### Step 1: Branch

```bash
git checkout main && git pull origin main && git checkout -b feat/certificates-module
```

### Step 2: Create `src/lib/pdf/CertificateTemplate.tsx`

```tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface Props {
  studentName: string
  courseName: string
  programName: string
  score: number
  issuedAt: string
}

const styles = StyleSheet.create({
  page: { padding: 48, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  border: {
    borderWidth: 4,
    borderColor: '#1e3a8a',
    borderStyle: 'solid',
    flex: 1,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: { fontSize: 12, color: '#1e3a8a', letterSpacing: 2 },
  title: { fontSize: 36, fontWeight: 700, color: '#0f172a', marginTop: 24 },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 8 },
  name: { fontSize: 28, fontWeight: 700, color: '#1e3a8a', marginTop: 48 },
  body: { fontSize: 14, color: '#0f172a', marginTop: 16, textAlign: 'center' },
  footer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 48,
  },
  footerLabel: { fontSize: 10, color: '#64748b' },
  footerValue: { fontSize: 12, color: '#0f172a', marginTop: 4 },
})

export function CertificateTemplate({
  studentName,
  courseName,
  programName,
  score,
  issuedAt,
}: Props) {
  const issued = new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return (
    <Document>
      <Page size="LETTER" orientation="landscape" style={styles.page}>
        <View style={styles.border}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.brand}>FUNDAVIDA</Text>
            <Text style={styles.title}>Certificate of Completion</Text>
            <Text style={styles.subtitle}>
              Awarded in recognition of the successful completion of the course
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.name}>{studentName}</Text>
            <Text style={styles.body}>
              has successfully completed {courseName} ({programName}){'\n'}with a final score of{' '}
              {score}.
            </Text>
          </View>
          <View style={styles.footer}>
            <View>
              <Text style={styles.footerLabel}>ISSUED</Text>
              <Text style={styles.footerValue}>{issued}</Text>
            </View>
            <View>
              <Text style={styles.footerLabel}>PROGRAM</Text>
              <Text style={styles.footerValue}>{programName}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
```

### Step 3: Create eligibility helper `src/lib/certificates.ts`

```ts
import type { Grade, Student, Course } from '@/types'

export interface EligibleCertificate {
  studentId: string
  courseId: string
  score: number
  issuedAt: string
}

export const PASSING_SCORE = 70

export function buildEligibleList(
  students: Student[],
  courses: Course[],
  grades: Grade[]
): EligibleCertificate[] {
  const studentMap = new Map(students.map((s) => [s.id, s]))
  const courseMap = new Map(courses.map((c) => [c.id, c]))
  return grades
    .filter((g) => g.score >= PASSING_SCORE)
    .filter((g) => studentMap.has(g.studentId) && courseMap.has(g.courseId))
    .map((g) => ({
      studentId: g.studentId,
      courseId: g.courseId,
      score: g.score,
      issuedAt: g.issuedAt,
    }))
}
```

Tests at `src/lib/__tests__/certificates.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildEligibleList, PASSING_SCORE } from '../certificates'
import type { Grade, Student, Course } from '@/types'

const student: Student = {
  id: 'stu-1',
  firstName: 'A',
  lastName: 'B',
  email: 'a@b',
  gender: 'F',
  province: 'X',
  canton: 'Y',
  educationalLevel: 'Primary',
  enrolledCourseIds: ['cou-1'],
  createdAt: new Date().toISOString(),
}
const course: Course = {
  id: 'cou-1',
  name: 'Name',
  description: 'Desc',
  headquartersName: 'HQ',
  programName: 'Program',
  teacherId: 'tea-1',
  createdAt: new Date().toISOString(),
}

describe('buildEligibleList', () => {
  it('includes grades at or above the passing score', () => {
    const g: Grade = {
      id: 'gra-1',
      studentId: 'stu-1',
      courseId: 'cou-1',
      score: PASSING_SCORE,
      issuedAt: new Date().toISOString(),
    }
    expect(buildEligibleList([student], [course], [g]).length).toBe(1)
  })

  it('excludes grades below passing', () => {
    const g: Grade = {
      id: 'gra-1',
      studentId: 'stu-1',
      courseId: 'cou-1',
      score: PASSING_SCORE - 1,
      issuedAt: new Date().toISOString(),
    }
    expect(buildEligibleList([student], [course], [g])).toEqual([])
  })

  it('excludes grades referencing missing student or course', () => {
    const g: Grade = {
      id: 'gra-1',
      studentId: 'stu-does-not-exist',
      courseId: 'cou-1',
      score: 95,
      issuedAt: new Date().toISOString(),
    }
    expect(buildEligibleList([student], [course], [g])).toEqual([])
  })
})
```

### Step 4: Create `src/pages/CertificatesListPage.tsx`

```tsx
import { useState } from 'react'
import { pdf, PDFViewer } from '@react-pdf/renderer'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useStore } from '@/data/store'
import { buildEligibleList, type EligibleCertificate } from '@/lib/certificates'
import { CertificateTemplate } from '@/lib/pdf/CertificateTemplate'

export function CertificatesListPage() {
  const role = useStore((s) => s.role)
  const userId = useStore((s) => s.currentUserId)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const grades = useStore((s) => s.grades)

  const all = buildEligibleList(students, courses, grades)
  const list: EligibleCertificate[] =
    role === 'student' && userId ? all.filter((c) => c.studentId === userId) : all

  const [selected, setSelected] = useState<EligibleCertificate | null>(null)

  const selectedStudent = selected ? students.find((s) => s.id === selected.studentId) : null
  const selectedCourse = selected ? courses.find((c) => c.id === selected.courseId) : null

  async function download() {
    if (!selected || !selectedStudent || !selectedCourse) return
    const blob = await pdf(
      <CertificateTemplate
        studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
        courseName={selectedCourse.name}
        programName={selectedCourse.programName}
        score={selected.score}
        issuedAt={selected.issuedAt}
      />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `certificate-${selectedStudent.id}-${selectedCourse.id}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Certificates</h1>
        <p className="text-sm text-muted-foreground">
          Students who passed a course (score ≥ 70) earn a certificate. Preview and download the
          PDF.
        </p>
      </header>
      {list.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No eligible certificates yet.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((c) => {
              const s = students.find((x) => x.id === c.studentId)
              const cs = courses.find((x) => x.id === c.courseId)
              return (
                <TableRow key={`${c.studentId}-${c.courseId}`}>
                  <TableCell>
                    {s?.firstName} {s?.lastName}
                  </TableCell>
                  <TableCell>{cs?.name}</TableCell>
                  <TableCell>{c.score}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setSelected(c)}>
                      Preview
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}

      <Dialog open={selected !== null} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Certificate preview</DialogTitle>
          </DialogHeader>
          {selected && selectedStudent && selectedCourse && (
            <div className="space-y-4">
              <div className="h-[500px] overflow-hidden rounded-md border">
                <PDFViewer width="100%" height="100%">
                  <CertificateTemplate
                    studentName={`${selectedStudent.firstName} ${selectedStudent.lastName}`}
                    courseName={selectedCourse.name}
                    programName={selectedCourse.programName}
                    score={selected.score}
                    issuedAt={selected.issuedAt}
                  />
                </PDFViewer>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Close
                </Button>
                <Button onClick={download}>Download PDF</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

### Step 5: Routes

Add under `RoleGate allow={['admin', 'student']}`:

```tsx
<Route element={<RoleGate allow={['admin', 'student']} />}>
  <Route path="certificates" element={<CertificatesListPage />} />
</Route>
```

### Step 6: E2E — hero flow (generate certificate)

`e2e/certificates.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('admin previews and downloads a certificate', async ({ page }) => {
  // Seed data already contains passing grades — at least one certificate is eligible.
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as Admin' }).click()
  await page.getByRole('link', { name: 'Certificates' }).click()
  await expect(page.getByRole('heading', { name: 'Certificates' })).toBeVisible()

  await page.getByRole('button', { name: 'Preview' }).first().click()
  await expect(page.getByRole('heading', { name: 'Certificate preview' })).toBeVisible()

  // Capture the PDF download event
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download PDF' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^certificate-.*\.pdf$/)
})
```

### Step 7: Gauntlet, commit, PR

Standard flow. Commit:

```
feat: add certificates module with in-browser pdf generation

- buildEligibleList derives {student, course, grade} tuples where
  score >= 70. Student role sees only their own eligible certs;
  admin sees all. Covered by unit tests.
- CertificatesListPage tables the eligible set; clicking Preview
  opens a dialog with @react-pdf/renderer's PDFViewer. Download
  button generates the PDF blob in-browser and triggers a file
  download via an anchor.
- CertificateTemplate is a pure @react-pdf/renderer component —
  landscape letter, bordered layout, FundaVida brand blue, student
  name and score prominent.
- Route gated to admin + student via RoleGate.
- E2E: admin previews an eligible certificate and asserts the
  download event fires with a matching filename.
```

PR title: `feat: add certificates module with in-browser pdf generation`.

Stop — do not merge.

---

## Task 5: Phase 3 cleanup

**Branch:** `chore/phase-3-cleanup`

**Scope:** whatever the final cross-cutting review finds. Same shape as Phase 1 PR #11 and Phase 2 PR #15.

- Run a final holistic review subagent once Tasks 1-4 are merged.
- For each finding rated Important or above, apply the fix.
- Full gauntlet, commit, push, PR, watch CI.
- Stop — do not merge.

If the final review finds zero actionable items, skip this Task.

---

## Phase 3 Exit Criteria

When Tasks 1-4 (and optionally 5) are merged:

- Admin can create a student, enroll them, grade the enrollment, and download their certificate PDF — all in the browser.
- Teacher sees only their own courses; student sees only their enrolled courses; admin sees all.
- Reset demo data restores the seeded state and redirects the user back to `/`.
- Unit test count is ~60+; E2E covers 3 smoke + 3 hero flows = 6 Playwright tests.
- Repo has 18-19 merged PRs on `main`, all conventional-commit, no Claude attribution.
- Lighthouse on the landing and the dashboard both report Accessibility ≥ 95 (spot-check).

The next plan to write is **Phase 4** (Tier 2 modules: Teachers, Enrollments, Grades — basic CRUD under the pattern established in Phase 3).

## Deferred to later phases

- Bulk email module (Tier 3 read-only) — Phase 5.
- Attendance, Reports, Audit Logs, TCU (Tier 3) — Phase 5.
- i18n EN/ES — Phase 6.
- Marketing landing polish, README + screenshots + live demo URL, Vercel deploy, Lighthouse CI budget enforcement — Phase 7.
