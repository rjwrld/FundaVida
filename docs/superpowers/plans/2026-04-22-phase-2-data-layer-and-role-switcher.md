# Phase 2 — Data Layer & Role Switcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build an in-browser mock data layer (Zustand + seed JSON + localStorage) with a Supabase-shaped typed API surface, plus a demo role switcher that replaces real authentication, so later phases can port domain modules against a stable, fully-offline foundation.

**Architecture:** Zustand root store split into slices per domain. Seed JSON loaded on first visit, persisted to localStorage under a versioned key. Typed query/mutation functions in `src/data/api/` mimic the Supabase call shape so later page code reads naturally. A landing page presents four role CTAs (Admin, Teacher, Student, TCU); the header's `<RoleSwitcher />` lets visitors swap roles without leaving the app. Role-aware filtering in the data layer reproduces the intent of the original RLS policies.

**Tech Stack:** React 18 · TypeScript (strict) · Vite · Zustand · @tanstack/react-query · @react-pdf/renderer · @faker-js/faker (dev) · React Router v6 · Tailwind · shadcn/ui · Vitest · Playwright. No backend, no i18n (Phase 6).

**Phase output:** a visitor lands on a professional landing page with four role CTAs, clicks one, and arrives at a role-aware dashboard shell. All data is in-browser. Role swap works in the header. `/app` routes are protected — no role means redirect to `/`. 4 merged PRs.

**Workflow reminders:**

- One branch → one PR → one merge into `main` per Task.
- Start each Task by branching off a fresh `main`.
- Never `Co-Authored-By: Claude` trailers. Never "Generated with Claude Code" footers.
- Never push to `main`. Never force-push.
- Conventional commits, lowercase-first imperative (commitlint enforces this; sentence-case is blocked).

---

## Task 1: Prep for domain work — deps + vercel.json

**Branch:** `chore/phase-2-prep`

**Files:**

- Modify: `package.json` (new deps)
- Create: `vercel.json`

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b chore/phase-2-prep
```

- [ ] **Step 2: Install runtime deps**

```bash
npm install zustand@^5.0.0 @tanstack/react-query@^5.59.0 @react-pdf/renderer@^4.0.0
```

- [ ] **Step 3: Install dev deps**

```bash
npm install -D @faker-js/faker@^9.0.3
```

- [ ] **Step 4: Create `vercel.json` for SPA routing**

Deep-link requests to `/some/path` must rewrite to `/index.html` so React Router can handle them. Without this, Vercel returns 404 for any URL that isn't `/`.

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

- [ ] **Step 5: Full gauntlet**

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run e2e
```

All exit 0. No behavior changes.

- [ ] **Step 6: Commit and push**

```bash
git add package.json package-lock.json vercel.json
git commit -m "$(cat <<'EOF'
chore: install phase 2 runtime deps and add vercel spa rewrite

Adds zustand, @tanstack/react-query, @react-pdf/renderer, and
@faker-js/faker (dev) for the upcoming mock data layer. Ships a
vercel.json SPA rewrite so deep-link requests (e.g. /dashboard) hit
index.html instead of Vercel's 404 page.
EOF
)"
git push -u origin chore/phase-2-prep
```

- [ ] **Step 7: Open PR**

```bash
gh pr create --base main --head chore/phase-2-prep --title "chore: install phase 2 deps and add vercel rewrite" --body "$(cat <<'EOF'
## Summary

Preps the repo for Phase 2 domain work: installs zustand, @tanstack/react-query, @react-pdf/renderer, and @faker-js/faker (dev). Adds vercel.json SPA rewrite so deep-links served via Vercel work.

## Test plan

- [x] Full gauntlet passes (typecheck, lint, test, build, e2e)
- [x] No behavior change
EOF
)"
```

- [ ] **Step 8: Stop — do not merge**

---

## Task 2: Mock data foundation

**Branch:** `feat/mock-data-foundation`

**Files:**

- Create: `src/types/domain.ts`
- Create: `src/types/index.ts`
- Create: `src/data/seed/students.ts`
- Create: `src/data/seed/teachers.ts`
- Create: `src/data/seed/courses.ts`
- Create: `src/data/seed/enrollments.ts`
- Create: `src/data/seed/grades.ts`
- Create: `src/data/seed/index.ts`
- Create: `src/data/persistence.ts`
- Create: `src/data/store.ts`
- Create: `src/data/api/students.ts`
- Create: `src/data/api/courses.ts`
- Create: `src/data/api/index.ts`
- Create: `src/data/__tests__/persistence.test.ts`
- Create: `src/data/__tests__/store.test.ts`
- Create: `src/data/__tests__/api.students.test.ts`
- Modify: `src/main.tsx` (wrap App with QueryClientProvider)

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b feat/mock-data-foundation
```

- [ ] **Step 2: Create `src/types/domain.ts`**

```ts
export type Role = 'admin' | 'teacher' | 'student' | 'tcu'

export type Gender = 'F' | 'M' | 'X'

export interface Student {
  id: string
  firstName: string
  lastName: string
  email: string
  gender: Gender
  province: string
  canton: string
  educationalLevel: string
  enrolledCourseIds: string[]
  createdAt: string
}

export interface Teacher {
  id: string
  firstName: string
  lastName: string
  email: string
  courseIds: string[]
  createdAt: string
}

export interface Course {
  id: string
  name: string
  description: string
  headquartersName: string
  programName: string
  teacherId: string
  createdAt: string
}

export interface Enrollment {
  id: string
  studentId: string
  courseId: string
  enrolledAt: string
}

export interface Grade {
  id: string
  studentId: string
  courseId: string
  score: number
  issuedAt: string
}
```

- [ ] **Step 3: Create `src/types/index.ts`**

```ts
export * from './domain'
```

- [ ] **Step 4: Create seed data modules**

Each seed module exports a function that returns a deterministic list of records. `@faker-js/faker` is seeded so results are stable across reloads.

Create `src/data/seed/students.ts`:

```ts
import { faker } from '@faker-js/faker'
import type { Student } from '@/types'

export function seedStudents(count = 24): Student[] {
  faker.seed(42)
  const provinces = ['San José', 'Heredia', 'Alajuela', 'Cartago']
  const levels = ['Primary', 'Secondary', 'University']
  return Array.from({ length: count }, (_, i) => ({
    id: `stu-${i + 1}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    gender: faker.helpers.arrayElement(['F', 'M', 'X'] as const),
    province: faker.helpers.arrayElement(provinces),
    canton: faker.location.city(),
    educationalLevel: faker.helpers.arrayElement(levels),
    enrolledCourseIds: [],
    createdAt: faker.date.past({ years: 1 }).toISOString(),
  }))
}
```

Create `src/data/seed/teachers.ts`:

```ts
import { faker } from '@faker-js/faker'
import type { Teacher } from '@/types'

export function seedTeachers(count = 6): Teacher[] {
  faker.seed(43)
  return Array.from({ length: count }, (_, i) => ({
    id: `tea-${i + 1}`,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    courseIds: [],
    createdAt: faker.date.past({ years: 2 }).toISOString(),
  }))
}
```

Create `src/data/seed/courses.ts`:

```ts
import { faker } from '@faker-js/faker'
import type { Course } from '@/types'

export function seedCourses(teacherIds: string[], count = 8): Course[] {
  faker.seed(44)
  const hqs = ['San José HQ', 'Heredia HQ', 'Alajuela HQ']
  const programs = ['Literacy', 'Math', 'English', 'Life Skills']
  return Array.from({ length: count }, (_, i) => {
    const teacherIdFallback = teacherIds[0] ?? 'tea-1'
    const teacherId = teacherIds[i % teacherIds.length] ?? teacherIdFallback
    return {
      id: `cou-${i + 1}`,
      name: `${faker.helpers.arrayElement(programs)} ${i + 1}`,
      description: faker.lorem.sentence(),
      headquartersName: faker.helpers.arrayElement(hqs),
      programName: faker.helpers.arrayElement(programs),
      teacherId,
      createdAt: faker.date.past({ years: 1 }).toISOString(),
    }
  })
}
```

Create `src/data/seed/enrollments.ts`:

```ts
import { faker } from '@faker-js/faker'
import type { Enrollment } from '@/types'

export function seedEnrollments(studentIds: string[], courseIds: string[]): Enrollment[] {
  faker.seed(45)
  const enrollments: Enrollment[] = []
  studentIds.forEach((sid, si) => {
    const take = faker.number.int({ min: 1, max: 3 })
    const picked = faker.helpers.arrayElements(courseIds, take)
    picked.forEach((cid, ci) => {
      enrollments.push({
        id: `enr-${si + 1}-${ci + 1}`,
        studentId: sid,
        courseId: cid,
        enrolledAt: faker.date.past({ years: 1 }).toISOString(),
      })
    })
  })
  return enrollments
}
```

Create `src/data/seed/grades.ts`:

```ts
import { faker } from '@faker-js/faker'
import type { Grade, Enrollment } from '@/types'

export function seedGrades(enrollments: Enrollment[]): Grade[] {
  faker.seed(46)
  return enrollments.map((e, i) => ({
    id: `gra-${i + 1}`,
    studentId: e.studentId,
    courseId: e.courseId,
    score: faker.number.int({ min: 55, max: 100 }),
    issuedAt: faker.date.recent({ days: 180 }).toISOString(),
  }))
}
```

Create `src/data/seed/index.ts`:

```ts
import { seedStudents } from './students'
import { seedTeachers } from './teachers'
import { seedCourses } from './courses'
import { seedEnrollments } from './enrollments'
import { seedGrades } from './grades'
import type { Student, Teacher, Course, Enrollment, Grade } from '@/types'

export interface SeedSnapshot {
  students: Student[]
  teachers: Teacher[]
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
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
  return { students, teachers, courses, enrollments, grades }
}
```

- [ ] **Step 5: Create `src/data/persistence.ts`**

```ts
import type { SeedSnapshot } from './seed'
import type { Role } from '@/types'

const STATE_KEY = 'fundavida:v1:state'
const ROLE_KEY = 'fundavida:v1:role'

export interface PersistedState extends SeedSnapshot {
  role: Role | null
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadPersistedState(): PersistedState | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(STATE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

export function savePersistedState(state: PersistedState): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded or serialization failure — best-effort persistence.
  }
}

export function clearPersistedState(): void {
  if (!isBrowser()) return
  window.localStorage.removeItem(STATE_KEY)
  window.localStorage.removeItem(ROLE_KEY)
}

export function loadPersistedRole(): Role | null {
  if (!isBrowser()) return null
  const raw = window.localStorage.getItem(ROLE_KEY)
  if (raw === 'admin' || raw === 'teacher' || raw === 'student' || raw === 'tcu') return raw
  return null
}

export function savePersistedRole(role: Role): void {
  if (!isBrowser()) return
  window.localStorage.setItem(ROLE_KEY, role)
}
```

- [ ] **Step 6: Create `src/data/store.ts`**

```ts
import { create } from 'zustand'
import type { Student, Teacher, Course, Enrollment, Grade, Role } from '@/types'
import { buildSeedSnapshot } from './seed'
import {
  loadPersistedRole,
  loadPersistedState,
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
  setRole: (role: Role) => void
  resetDemo: () => void
}

function initialState(): Omit<StoreState, 'setRole' | 'resetDemo'> {
  const persisted = loadPersistedState()
  if (persisted) {
    return {
      students: persisted.students,
      teachers: persisted.teachers,
      courses: persisted.courses,
      enrollments: persisted.enrollments,
      grades: persisted.grades,
      role: loadPersistedRole(),
    }
  }
  const snapshot = buildSeedSnapshot()
  return { ...snapshot, role: loadPersistedRole() }
}

export const useStore = create<StoreState>((set, get) => ({
  ...initialState(),
  setRole: (role) => {
    savePersistedRole(role)
    set({ role })
  },
  resetDemo: () => {
    const snapshot = buildSeedSnapshot()
    set({
      ...snapshot,
      role: null,
    })
    savePersistedState({ ...snapshot, role: null })
  },
}))

// Persist on every state change.
useStore.subscribe((state) => {
  savePersistedState({
    students: state.students,
    teachers: state.teachers,
    courses: state.courses,
    enrollments: state.enrollments,
    grades: state.grades,
    role: state.role,
  })
})
```

- [ ] **Step 7: Create `src/data/api/students.ts`**

The API surface mirrors the original Supabase call shape (`api.students.list()`, `api.students.get(id)`, etc.) so future page code reads naturally. Each function returns a promise with ~150ms artificial latency to keep loading skeletons honest.

```ts
import type { Student } from '@/types'
import { useStore } from '../store'

function delay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function applyRoleFilter(students: Student[]): Student[] {
  const role = useStore.getState().role
  if (role === 'admin' || role === 'teacher') return students
  // Student and TCU roles see nothing students-listy by default; hero
  // flows refine this in later phases.
  return []
}

export const studentsApi = {
  async list(): Promise<Student[]> {
    await delay()
    const students = useStore.getState().students
    return applyRoleFilter(students)
  },
  async get(id: string): Promise<Student | null> {
    await delay()
    const students = useStore.getState().students
    return students.find((s) => s.id === id) ?? null
  },
}
```

- [ ] **Step 8: Create `src/data/api/courses.ts`**

```ts
import type { Course } from '@/types'
import { useStore } from '../store'

function delay(ms = 150): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function applyRoleFilter(courses: Course[]): Course[] {
  const role = useStore.getState().role
  if (role === 'admin') return courses
  if (role === 'teacher') {
    // Teachers see only their own courses. Until we have a current-
    // user concept, teachers see everything taught by `tea-1` as a
    // stand-in. Hero flows tighten this in Phase 3.
    return courses.filter((c) => c.teacherId === 'tea-1')
  }
  return courses
}

export const coursesApi = {
  async list(): Promise<Course[]> {
    await delay()
    const courses = useStore.getState().courses
    return applyRoleFilter(courses)
  },
  async get(id: string): Promise<Course | null> {
    await delay()
    const courses = useStore.getState().courses
    return courses.find((c) => c.id === id) ?? null
  },
}
```

- [ ] **Step 9: Create `src/data/api/index.ts`**

```ts
import { studentsApi } from './students'
import { coursesApi } from './courses'

export const api = {
  students: studentsApi,
  courses: coursesApi,
}
```

- [ ] **Step 10: Wrap App with `QueryClientProvider`**

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import './index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 0,
    },
  },
})

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
```

- [ ] **Step 11: Write unit tests**

Create `src/data/__tests__/persistence.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearPersistedState,
  loadPersistedRole,
  loadPersistedState,
  savePersistedRole,
  savePersistedState,
} from '../persistence'
import { buildSeedSnapshot } from '../seed'

describe('persistence', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when nothing is persisted', () => {
    expect(loadPersistedState()).toBeNull()
    expect(loadPersistedRole()).toBeNull()
  })

  it('round-trips a persisted snapshot', () => {
    const snapshot = buildSeedSnapshot()
    savePersistedState({ ...snapshot, role: 'admin' })
    const loaded = loadPersistedState()
    expect(loaded?.students.length).toBe(snapshot.students.length)
    expect(loaded?.role).toBe('admin')
  })

  it('persists and loads a role independently', () => {
    savePersistedRole('teacher')
    expect(loadPersistedRole()).toBe('teacher')
  })

  it('clearPersistedState wipes both keys', () => {
    savePersistedState({ ...buildSeedSnapshot(), role: 'admin' })
    savePersistedRole('admin')
    clearPersistedState()
    expect(loadPersistedState()).toBeNull()
    expect(loadPersistedRole()).toBeNull()
  })
})
```

Create `src/data/__tests__/store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from '../store'
import { clearPersistedState } from '../persistence'

describe('useStore', () => {
  beforeEach(() => {
    clearPersistedState()
    useStore.getState().resetDemo()
  })

  it('seeds students, teachers, courses, enrollments, and grades', () => {
    const s = useStore.getState()
    expect(s.students.length).toBeGreaterThan(0)
    expect(s.teachers.length).toBeGreaterThan(0)
    expect(s.courses.length).toBeGreaterThan(0)
    expect(s.enrollments.length).toBeGreaterThan(0)
    expect(s.grades.length).toBeGreaterThan(0)
  })

  it('setRole persists and updates state', () => {
    useStore.getState().setRole('admin')
    expect(useStore.getState().role).toBe('admin')
    expect(window.localStorage.getItem('fundavida:v1:role')).toBe('admin')
  })

  it('resetDemo clears role and reseeds data', () => {
    useStore.getState().setRole('teacher')
    useStore.getState().resetDemo()
    expect(useStore.getState().role).toBeNull()
    expect(useStore.getState().students.length).toBeGreaterThan(0)
  })
})
```

Create `src/data/__tests__/api.students.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { api } from '../api'
import { useStore } from '../store'
import { clearPersistedState } from '../persistence'

describe('api.students', () => {
  beforeEach(() => {
    clearPersistedState()
    useStore.getState().resetDemo()
  })

  it('admin sees all students', async () => {
    useStore.getState().setRole('admin')
    const list = await api.students.list()
    expect(list.length).toBe(useStore.getState().students.length)
  })

  it('student sees empty list in the generic list endpoint', async () => {
    useStore.getState().setRole('student')
    const list = await api.students.list()
    expect(list.length).toBe(0)
  })

  it('get returns the matching student by id', async () => {
    useStore.getState().setRole('admin')
    const first = useStore.getState().students[0]
    if (!first) throw new Error('expected at least one student in the seed')
    const found = await api.students.get(first.id)
    expect(found?.id).toBe(first.id)
  })

  it('get returns null for an unknown id', async () => {
    useStore.getState().setRole('admin')
    const found = await api.students.get('stu-does-not-exist')
    expect(found).toBeNull()
  })
})
```

- [ ] **Step 12: Full gauntlet**

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run e2e
```

All exit 0. Vitest test count is now 8 (from Phase 1 cleanup) + new data-layer tests. E2E still 2.

- [ ] **Step 13: Commit, push, PR**

```bash
git add package.json package-lock.json src/
git commit -m "$(cat <<'EOF'
feat: add mock data foundation with zustand and seed data

Introduces the in-browser data layer that future domain modules read
against. Core pieces:

- src/types/: domain types for Student, Teacher, Course, Enrollment,
  Grade, and Role. These mirror the original schema so page code
  ported from the old repo changes minimally.
- src/data/seed/: faker-seeded, deterministic starter data for every
  domain. A single buildSeedSnapshot() function wires cross-references
  (teachers.courseIds, students.enrolledCourseIds).
- src/data/persistence.ts: versioned localStorage round-trip for the
  full state snapshot and the selected role. Separate keys keep role
  swaps from rewriting the entire snapshot.
- src/data/store.ts: a Zustand store that loads persisted state on
  construction, falls back to the seed snapshot, and persists on
  every mutation. Exposes setRole and resetDemo.
- src/data/api/: Supabase-shaped query functions (api.students.list,
  api.students.get, api.courses.list, api.courses.get) with 150ms
  artificial latency so loading skeletons look honest. Role-aware
  filtering reproduces the intent of the original RLS policies; hero
  flows tighten it in later phases.
- src/main.tsx: wraps App in QueryClientProvider with 5-minute
  staleTime and 30-minute gcTime so future page hooks can use React
  Query out of the box.
- Unit tests cover persistence round-trip, store init and role
  persistence, and role-aware filtering on the students API.
EOF
)"
git push -u origin feat/mock-data-foundation
gh pr create --base main --head feat/mock-data-foundation --title "feat: add mock data foundation with zustand" --body "$(cat <<'EOF'
## Summary

Adds the in-browser mock data layer: domain types, faker-seeded deterministic data, localStorage persistence under versioned keys, a Zustand store, and a Supabase-shaped \`api\` surface (\`api.students.list()\`, \`api.courses.list()\`, etc.) with 150ms artificial latency. Role-aware filtering is in place for Phase 3 hero flows to build on.

Also wraps the app in \`QueryClientProvider\` so upcoming page hooks can use React Query.

## Changes

- \`src/types/\` — domain types (Student, Teacher, Course, Enrollment, Grade, Role).
- \`src/data/seed/\` — faker-seeded seed builders.
- \`src/data/persistence.ts\` — versioned localStorage round-trip.
- \`src/data/store.ts\` — Zustand store with seeding + persistence.
- \`src/data/api/\` — Supabase-shaped query functions.
- \`src/data/__tests__/\` — persistence, store, and api unit tests.
- \`src/main.tsx\` — QueryClientProvider wrap.

## Test plan

- [x] \`npm run typecheck\` passes
- [x] \`npm run lint\` passes
- [x] \`npm run format:check\` passes
- [x] \`npm test\` — includes persistence, store, api test files
- [x] \`npm run build\` passes
- [x] \`npm run e2e\` — 2 smoke tests still pass
EOF
)"
```

- [ ] **Step 14: Stop — do not merge**

---

## Task 3: Demo role switcher + landing

**Branch:** `feat/demo-role-switcher`

**Files:**

- Create: `src/components/demo/DemoBanner.tsx`
- Create: `src/components/demo/RoleSwitcher.tsx`
- Create: `src/components/demo/RoleRequired.tsx`
- Create: `src/pages/LandingPage.tsx`
- Create: `src/pages/DashboardPage.tsx`
- Create: `src/components/demo/__tests__/RoleSwitcher.test.tsx`
- Create: `src/components/demo/__tests__/RoleRequired.test.tsx`
- Modify: `src/App.tsx` (routes: `/` → LandingPage; `/app/*` → AppLayout; `/` with role redirects to `/app`)
- Modify: `src/components/layout/AppHeader.tsx` (add RoleSwitcher on the right)
- Modify: `src/components/layout/AppLayout.tsx` (include DemoBanner above the header)
- Modify: `src/pages/HomePage.tsx` → now rendered at `/app` as DashboardPage (simpler: rename)
- Modify: `e2e/smoke.spec.ts` (expand to cover role pick → dashboard flow)

---

- [ ] **Step 1: Branch**

```bash
git checkout main && git pull origin main && git checkout -b feat/demo-role-switcher
```

- [ ] **Step 2: Install shadcn primitives we'll use**

```bash
npx shadcn@latest add dropdown-menu alert
```

If the CLI prompts for overwrites, accept. This adds `src/components/ui/dropdown-menu.tsx` and `src/components/ui/alert.tsx`.

Verify they were added; if the prompts made the command interactive and you can't complete them, create the files manually by copying the canonical shadcn source and adjust the `cn` import path to `@/lib/utils`. Keep the existing Button and Card untouched.

- [ ] **Step 3: Create `src/components/demo/DemoBanner.tsx`**

```tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

const DISMISS_KEY = 'fundavida:v1:banner-dismissed'

export function DemoBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(window.localStorage.getItem(DISMISS_KEY) !== '1')
  }, [])

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="bg-primary/10 text-sm">
      <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-2">
        <p>
          <strong>Demo mode.</strong> All data lives in your browser and resets on the &quot;Reset
          demo data&quot; button in the footer.
        </p>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `src/components/demo/RoleSwitcher.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useStore } from '@/data/store'
import type { Role } from '@/types'

const ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'student', label: 'Student' },
  { value: 'tcu', label: 'TCU' },
]

export function RoleSwitcher() {
  const role = useStore((s) => s.role)
  const setRole = useStore((s) => s.setRole)
  const navigate = useNavigate()

  const current = ROLES.find((r) => r.value === role)

  function pick(next: Role) {
    setRole(next)
    navigate('/app')
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          {current ? `Role: ${current.label}` : 'Choose role'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Switch role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r) => (
          <DropdownMenuItem key={r.value} onSelect={() => pick(r.value)}>
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 5: Create `src/components/demo/RoleRequired.tsx`**

Protects `/app/*` routes: if no role is picked, redirect to `/`.

```tsx
import { Navigate, Outlet } from 'react-router-dom'
import { useStore } from '@/data/store'

export function RoleRequired() {
  const role = useStore((s) => s.role)
  if (!role) return <Navigate to="/" replace />
  return <Outlet />
}
```

- [ ] **Step 6: Create `src/pages/LandingPage.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/data/store'
import type { Role } from '@/types'

const ROLES: { value: Role; label: string; blurb: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    blurb: 'Full access — manage students, courses, certificates.',
  },
  {
    value: 'teacher',
    label: 'Teacher',
    blurb: 'See assigned courses, grade students, track attendance.',
  },
  { value: 'student', label: 'Student', blurb: 'View enrolled courses, grades, and certificates.' },
  { value: 'tcu', label: 'TCU', blurb: 'Trainee / community-leader view of assigned activities.' },
]

export function LandingPage() {
  const setRole = useStore((s) => s.setRole)
  const navigate = useNavigate()

  function enter(role: Role) {
    setRole(role)
    navigate('/app')
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 space-y-10">
      <header className="space-y-3 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">FundaVida</h1>
        <p className="text-muted-foreground">
          Educational management platform demo. All data runs in your browser — pick a role to
          explore.
        </p>
      </header>
      <section aria-labelledby="roles-heading" className="space-y-4">
        <h2 id="roles-heading" className="sr-only">
          Choose a demo role
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {ROLES.map((r) => (
            <Card key={r.value}>
              <CardHeader>
                <CardTitle>{r.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{r.blurb}</p>
                <Button onClick={() => enter(r.value)}>Enter as {r.label}</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  )
}
```

- [ ] **Step 7: Create `src/pages/DashboardPage.tsx`**

This replaces `HomePage` as the `/app` landing. The old HomePage is removed.

```tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/data/store'

export function DashboardPage() {
  const role = useStore((s) => s.role)
  const counts = useStore((s) => ({
    students: s.students.length,
    teachers: s.teachers.length,
    courses: s.courses.length,
    grades: s.grades.length,
  }))

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Signed in as {role ?? 'unknown'}</h1>
        <p className="text-sm text-muted-foreground">
          Demo dashboard. Domain modules land in subsequent phases.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['students', 'teachers', 'courses', 'grades'] as const).map((key) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="capitalize">{key}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{counts[key]}</p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  )
}
```

- [ ] **Step 8: Update `src/App.tsx` routes**

Replace the file with:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { LandingPage } from '@/pages/LandingPage'
import { DashboardPage } from '@/pages/DashboardPage'
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
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 9: Update `src/components/layout/AppHeader.tsx` to include the role switcher**

Replace the file:

```tsx
import { Link } from 'react-router-dom'
import { RoleSwitcher } from '@/components/demo/RoleSwitcher'

export function AppHeader() {
  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/app" className="font-semibold tracking-tight">
          FundaVida
        </Link>
        <div className="flex items-center gap-3">
          <nav aria-label="Primary" className="text-sm text-muted-foreground">
            <span>Demo</span>
          </nav>
          <RoleSwitcher />
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Step 10: Update `src/components/layout/AppLayout.tsx` to render `DemoBanner` above the header**

```tsx
import { Outlet } from 'react-router-dom'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { DemoBanner } from '@/components/demo/DemoBanner'

export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:shadow focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <DemoBanner />
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main id="main-content" className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 11: Delete the old HomePage**

```bash
git rm src/pages/HomePage.tsx
```

(Not needed for the plan — but if there are any other references to HomePage, remove them. `App.tsx` no longer imports it.)

- [ ] **Step 12: Unit tests**

Create `src/components/demo/__tests__/RoleSwitcher.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { RoleSwitcher } from '@/components/demo/RoleSwitcher'
import { useStore } from '@/data/store'
import { clearPersistedState } from '@/data/persistence'

describe('<RoleSwitcher />', () => {
  beforeEach(() => {
    clearPersistedState()
    useStore.getState().resetDemo()
  })

  it('shows a prompt when no role is selected', () => {
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleSwitcher />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /choose role/i })).toBeInTheDocument()
  })

  it('shows the current role label when one is selected', () => {
    useStore.getState().setRole('teacher')
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleSwitcher />
      </MemoryRouter>
    )
    expect(screen.getByRole('button', { name: /role: teacher/i })).toBeInTheDocument()
  })

  it('opens the dropdown and swaps roles on selection', async () => {
    const user = userEvent.setup()
    useStore.getState().setRole('admin')
    render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <RoleSwitcher />
      </MemoryRouter>
    )
    await user.click(screen.getByRole('button', { name: /role: admin/i }))
    await user.click(screen.getByRole('menuitem', { name: /student/i }))
    expect(useStore.getState().role).toBe('student')
  })
})
```

Create `src/components/demo/__tests__/RoleRequired.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { RoleRequired } from '@/components/demo/RoleRequired'
import { useStore } from '@/data/store'
import { clearPersistedState } from '@/data/persistence'

describe('<RoleRequired />', () => {
  beforeEach(() => {
    clearPersistedState()
    useStore.getState().resetDemo()
  })

  it('redirects to / when no role is selected', () => {
    render(
      <MemoryRouter
        initialEntries={['/app']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<div>landing</div>} />
          <Route element={<RoleRequired />}>
            <Route path="/app" element={<div>protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('landing')).toBeInTheDocument()
  })

  it('renders the protected outlet when a role is set', () => {
    useStore.getState().setRole('admin')
    render(
      <MemoryRouter
        initialEntries={['/app']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/" element={<div>landing</div>} />
          <Route element={<RoleRequired />}>
            <Route path="/app" element={<div>protected</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('protected')).toBeInTheDocument()
  })
})
```

- [ ] **Step 13: Update the E2E smoke test to cover the role flow**

Replace `e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('smoke', () => {
  test('landing renders FundaVida heading and four role CTAs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'FundaVida' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as Admin' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as Teacher' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as Student' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as TCU' })).toBeVisible()
  })

  test('picking a role lands on the dashboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter as Admin' }).click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { name: /signed in as admin/i })).toBeVisible()
  })

  test('unknown route renders 404 with a back link', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
  })
})
```

- [ ] **Step 14: Full gauntlet**

```bash
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run e2e
```

All exit 0. Vitest: data-layer tests + RoleSwitcher + RoleRequired tests. Playwright: 3 E2E tests.

- [ ] **Step 15: Commit, push, PR**

```bash
git add src/ e2e/ package.json package-lock.json
git commit -m "$(cat <<'EOF'
feat: add demo role switcher and landing page

Replaces the placeholder HomePage with a full demo-entry flow:

- /: LandingPage with four role CTAs (Admin, Teacher, Student, TCU).
  Clicking one persists the role and navigates to /app.
- /app: protected by <RoleRequired />, which redirects to / when no
  role is picked. Renders AppLayout (header + sidebar + Outlet) with
  DashboardPage as the index route.
- RoleSwitcher in the header swaps roles without leaving /app.
- DemoBanner sits above the header on first visit and is dismissable,
  with the choice persisted to localStorage.
- Protects all /app routes; NotFoundPage still handles the wildcard.

Tests cover RoleSwitcher prompt/current-label/swap behavior and
RoleRequired redirect semantics. Playwright smoke adds the role-pick
-> dashboard flow.
EOF
)"
git push -u origin feat/demo-role-switcher
gh pr create --base main --head feat/demo-role-switcher --title "feat: add demo role switcher and landing page" --body "$(cat <<'EOF'
## Summary

Full demo entry flow: landing page with four role CTAs, role-gated \`/app\` routes, header role switcher, and a dismissable first-visit banner. Replaces the placeholder HomePage with a DashboardPage that shows seeded counts by role.

## Changes

- \`src/pages/{LandingPage,DashboardPage}.tsx\` — new pages; HomePage removed.
- \`src/components/demo/{DemoBanner,RoleSwitcher,RoleRequired}.tsx\` — demo primitives.
- \`src/App.tsx\` — new route tree (\`/\` landing, \`/app/*\` protected).
- \`src/components/layout/{AppHeader,AppLayout}.tsx\` — header embeds RoleSwitcher, layout shows DemoBanner.
- \`src/components/demo/__tests__/\` — unit tests for RoleSwitcher and RoleRequired.
- \`e2e/smoke.spec.ts\` — role-pick flow added.

## Test plan

- [x] \`npm run typecheck\` passes
- [x] \`npm run lint\` passes
- [x] \`npm run format:check\` passes
- [x] \`npm test\` passes (data-layer + RoleSwitcher + RoleRequired)
- [x] \`npm run build\` passes
- [x] \`npm run e2e\` — 3 smoke tests pass
EOF
)"
```

- [ ] **Step 16: Stop — do not merge**

---

## Task 4: Phase 2 cleanup

**Branch:** `chore/phase-2-cleanup`

**Scope:** whatever the final cross-cutting review finds. Expect ~0-5 small fixes. Same shape as Phase 1's cleanup PR (#11):

- [ ] **Step 1:** Run a final cross-cutting review via a code-quality subagent once Tasks 1-3 are merged.
- [ ] **Step 2:** For each finding rated Important or better, apply the fix.
- [ ] **Step 3:** Full gauntlet.
- [ ] **Step 4:** Commit, push, PR, watch CI.
- [ ] **Step 5:** Stop — do not merge.

If the final review finds zero actionable items, skip this Task entirely.

---

## Phase 2 Exit Criteria

When Tasks 1-3 (and optionally 4) are merged:

- Visitor lands on `/`, sees four role CTAs, picks one, arrives on `/app` role-aware dashboard.
- RoleSwitcher swaps roles without leaving the app; DemoBanner is dismissable.
- All data is in-browser; resetting demo data reseeds; localStorage persists across reloads.
- `npm test` covers: persistence, store, students API, RoleSwitcher, RoleRequired, and Phase 1's existing AppLayout + Button + cn tests.
- `npm run e2e` covers: landing renders CTAs, role-pick → dashboard, 404.
- Lighthouse (optional spot-check) shows the landing page at 90/95/95+.
- 4 merged PRs (or 3 if cleanup was not needed).

The next plan to write is Phase 3 (Tier 1 modules: Students, Courses, Certificates) once Phase 2 is fully merged and green.

## Deferred to later phases

- Tier 1/2/3 modules with CRUD — Phases 3-5.
- i18n with English/Spanish toggle — Phase 6.
- Landing page marketing polish, README + screenshots + live demo URL, Vercel deploy — Phase 7.
- Advanced error boundaries, global error UI beyond the data-layer retry story — Phase 7.
