import { test, expect, type Page } from '@playwright/test'
import { seedDemo } from '../src/data/seed'
import { shortCourseName } from '../src/lib/courseName'

// Storage keys must match src/data/persistence.ts.
const STATE_KEY = 'fundavida:v9:state'
const ROLE_KEY = 'fundavida:v2:role'
const USER_KEY = 'fundavida:v2:current-user'
const LOCALE_KEY = 'fundavida:v2:locale'

// A frozen epoch makes the seeded graph + clock deterministic (ADR-0014).
const EPOCH = new Date('2026-06-01T12:00:00.000Z')
const EPOCH_ISO = EPOCH.toISOString()

// Deterministic anchors probed from the seed:
// cou-8 is a published primaria "Habilidades para la Vida" cohort at Linda Vista,
// taught by tea-7, capacity 20, with stu-15 already approved. stu-1 (Linda
// Vista/primaria) has no prior cou-8 enrollment, so a fresh 'pending' request is
// valid and lands in tea-7's approval queue. The student and course names are
// derived from the seed so the spec follows it rather than hardcoding strings.
const TEACHER_ID = 'tea-7'
const STUDENT_ID = 'stu-1'
const COURSE_ID = 'cou-8'
const PENDING_ID = 'enr-e2e-pending'

const seedSnapshot = seedDemo(EPOCH)
const seedStudent = seedSnapshot.students.find((s) => s.id === STUDENT_ID)
if (!seedStudent) throw new Error(`seed must include ${STUDENT_ID}`)
const STUDENT_NAME = `${seedStudent.firstName} ${seedStudent.lastName}`
const seedCourse = seedSnapshot.courses.find((c) => c.id === COURSE_ID)
if (!seedCourse) throw new Error(`seed must include ${COURSE_ID}`)
// The approval queue and browse list show the full (unique) name; the courses
// table and the Course detail heading show the Sede-stripped display name (ADR-0021).
const COURSE_NAME = seedCourse.name
const COURSE_SHORT = shortCourseName(seedCourse)

type Snapshot = ReturnType<typeof seedDemo>

/** A seed snapshot with one pending request (stu-1 → cou-8) injected. */
function snapshotWithPending(mutate?: (snap: Snapshot) => void): Snapshot {
  const snap = seedDemo(EPOCH)
  snap.enrollments.push({
    id: PENDING_ID,
    studentId: STUDENT_ID,
    courseId: COURSE_ID,
    enrolledAt: EPOCH_ISO,
    status: 'pending',
    requestedAt: EPOCH_ISO,
  })
  mutate?.(snap)
  return snap
}

/**
 * Seed a snapshot via a one-time evaluate (NOT addInitScript, so store
 * mutations persist across later navigations) and land on /app as role/userId.
 */
async function seedAndEnter(
  page: Page,
  snapshot: Snapshot,
  role: 'teacher' | 'student' | 'admin',
  userId: string
) {
  await page.goto('/')
  await page.evaluate(
    ({ stateKey, state, roleKey, role, userKey, userId }) => {
      window.localStorage.setItem(stateKey, state)
      window.localStorage.setItem(roleKey, role)
      window.localStorage.setItem(userKey, userId)
    },
    {
      stateKey: STATE_KEY,
      state: JSON.stringify(snapshot),
      roleKey: ROLE_KEY,
      role,
      userKey: USER_KEY,
      userId,
    }
  )
  await page.goto('/app')
}

/** Switch role/user without resetting the persisted store state. */
async function switchTo(page: Page, role: 'teacher' | 'student' | 'admin', userId: string) {
  await page.evaluate(
    ({ roleKey, role, userKey, userId }) => {
      window.localStorage.setItem(roleKey, role)
      window.localStorage.setItem(userKey, userId)
    },
    { roleKey: ROLE_KEY, role, userKey: USER_KEY, userId }
  )
  await page.goto('/app')
}

/** Poll persisted state until the named enrollment reaches the expected status. */
async function persistedStatus(page: Page, enrollmentId: string): Promise<string | null> {
  return page.evaluate(
    ({ key, id }) => {
      const raw = window.localStorage.getItem(key)
      if (!raw) return null
      const state = JSON.parse(raw) as { enrollments: { id: string; status: string }[] }
      return state.enrollments.find((e) => e.id === id)?.status ?? null
    },
    { key: STATE_KEY, id: enrollmentId }
  )
}

test.describe('enrollment approval workflow', () => {
  test('teacher approves a pending request; queue updates live and it shows in the student my-courses', async ({
    page,
  }) => {
    await seedAndEnter(page, snapshotWithPending(), 'teacher', TEACHER_ID)

    // The approval queue widget on the teacher dashboard shows the pending row.
    await expect(page.getByRole('heading', { name: 'Enrollment requests' })).toBeVisible()
    const row = page.getByRole('row').filter({ hasText: STUDENT_NAME })
    await expect(row).toContainText(COURSE_NAME)

    // Approve — the row leaves the queue without a page reload (cache invalidation).
    await page.getByTestId(`approve-${PENDING_ID}`).click()
    await expect(page.getByText('Enrollment approved.')).toBeVisible()
    await expect(page.getByTestId(`approve-${PENDING_ID}`)).toBeHidden()

    // Wait for the approval to persist before switching roles.
    await expect.poll(async () => persistedStatus(page, PENDING_ID)).toBe('approved')

    // The approved course now appears in the student's own course list (the
    // courses table shows the Sede-stripped display name).
    await switchTo(page, 'student', STUDENT_ID)
    await page.getByRole('link', { name: 'Courses', exact: true }).click()
    await expect(page.getByText(COURSE_SHORT)).toBeVisible()
  })

  test('teacher rejects a pending request', async ({ page }) => {
    await seedAndEnter(page, snapshotWithPending(), 'teacher', TEACHER_ID)

    await expect(page.getByRole('heading', { name: 'Enrollment requests' })).toBeVisible()
    await page.getByTestId(`reject-${PENDING_ID}`).click()

    await expect(page.getByText('Enrollment rejected.')).toBeVisible()
    await expect(page.getByTestId(`reject-${PENDING_ID}`)).toBeHidden()
  })

  test('approve is disabled with a reason when the course is at capacity', async ({ page }) => {
    // cou-8 already has one approved (stu-15); capping capacity at 1 makes it full.
    const snapshot = snapshotWithPending((snap) => {
      const course = snap.courses.find((c) => c.id === COURSE_ID)
      if (!course) throw new Error('cou-8 missing from seed')
      course.capacity = 1
    })
    await seedAndEnter(page, snapshot, 'teacher', TEACHER_ID)

    await expect(page.getByRole('heading', { name: 'Enrollment requests' })).toBeVisible()
    const approve = page.getByTestId(`approve-${PENDING_ID}`)
    await expect(approve).toBeDisabled()
    await expect(approve).toHaveAttribute('title', 'Course is at capacity')
    // Rejecting a request remains available even when full.
    await expect(page.getByTestId(`reject-${PENDING_ID}`)).toBeEnabled()
  })

  test('student requests a spot through Browse and the teacher approves it end-to-end', async ({
    page,
  }) => {
    // Start from a clean seed (no pre-seeded pending) and drive the full UI.
    await seedAndEnter(page, seedDemo(EPOCH), 'student', STUDENT_ID)

    await page.getByRole('link', { name: 'Browse open courses' }).click()
    await expect(page.getByRole('heading', { name: 'Browse courses' })).toBeVisible()

    // Open the browseable course detail (browse list shows the full name; the
    // detail heading shows the Sede-stripped display name) and request a spot.
    await page.getByRole('button', { name: COURSE_NAME }).click()
    await expect(page.getByRole('heading', { name: COURSE_SHORT })).toBeVisible()
    await page.getByRole('button', { name: 'Request a spot' }).click()
    await expect(page.getByText('Request pending')).toBeVisible()

    // The request must persist before we switch roles.
    await expect
      .poll(async () =>
        page.evaluate(
          ({ key, studentId, courseId }) => {
            const raw = window.localStorage.getItem(key)
            if (!raw) return null
            const state = JSON.parse(raw) as {
              enrollments: { studentId: string; courseId: string; status: string }[]
            }
            return (
              state.enrollments.find(
                (e) =>
                  e.studentId === studentId && e.courseId === courseId && e.status === 'pending'
              )?.status ?? null
            )
          },
          { key: STATE_KEY, studentId: STUDENT_ID, courseId: COURSE_ID }
        )
      )
      .toBe('pending')

    // Teacher sees and approves it.
    await switchTo(page, 'teacher', TEACHER_ID)
    await expect(page.getByRole('heading', { name: 'Enrollment requests' })).toBeVisible()
    const row = page.getByRole('row').filter({ hasText: STUDENT_NAME })
    await expect(row).toContainText(COURSE_NAME)
    await row.getByRole('button', { name: 'Approve' }).click()
    await expect(page.getByText('Enrollment approved.')).toBeVisible()
  })

  test('approval queue renders in Spanish when locale is ES', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(
      ({ stateKey, state, roleKey, userKey, userId, localeKey }) => {
        window.localStorage.setItem(stateKey, state)
        window.localStorage.setItem(roleKey, 'teacher')
        window.localStorage.setItem(userKey, userId)
        window.localStorage.setItem(localeKey, 'es')
      },
      {
        stateKey: STATE_KEY,
        state: JSON.stringify(snapshotWithPending()),
        roleKey: ROLE_KEY,
        userKey: USER_KEY,
        userId: TEACHER_ID,
        localeKey: LOCALE_KEY,
      }
    )
    await page.goto('/app')

    await expect(page.getByRole('heading', { name: 'Solicitudes de matrícula' })).toBeVisible()
  })
})
