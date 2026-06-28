import { test, expect, type Page } from '@playwright/test'
import { seedDemo } from '../src/data/seed'

// Storage keys must match src/data/persistence.ts.
const STATE_KEY = 'fundavida:v4:state'
const ROLE_KEY = 'fundavida:v2:role'
const USER_KEY = 'fundavida:v2:current-user'
const LOCALE_KEY = 'fundavida:v2:locale'

// A frozen epoch makes the seeded graph + clock deterministic (ADR-0014).
const EPOCH = new Date('2026-06-01T12:00:00.000Z')
const EPOCH_ISO = EPOCH.toISOString()

// Deterministic anchors probed from the seed:
// cou-8 "Habilidades para la Vida 9" is published at Linda Vista (primaria),
// taught by tea-7, capacity 20, with stu-15 already approved. stu-1 (Sincere
// Schoen, Linda Vista/primaria) has no prior cou-8 enrollment, so a fresh
// 'pending' request is valid and lands in tea-7's approval queue.
const TEACHER_ID = 'tea-7'
const STUDENT_ID = 'stu-1'
const STUDENT_NAME = 'Sincere Schoen'
const COURSE_ID = 'cou-8'
const COURSE_NAME = 'Habilidades para la Vida 9'
const PENDING_ID = 'enr-e2e-pending'

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

    // The approved course now appears in the student's own course list.
    await switchTo(page, 'student', STUDENT_ID)
    await page.getByRole('link', { name: 'Courses', exact: true }).click()
    await expect(page.getByText(COURSE_NAME)).toBeVisible()
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

    // Open the browseable course detail and request a spot.
    await page.getByRole('button', { name: COURSE_NAME }).click()
    await expect(page.getByRole('heading', { name: COURSE_NAME })).toBeVisible()
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
