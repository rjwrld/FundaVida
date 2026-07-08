import { test, expect, type Page } from '@playwright/test'
import { seedDemo } from '../src/data/seed'
import { STATE_KEY } from '../src/data/persistence'
import { shortCourseName } from '../src/lib/courseName'
import { weekAgendaDays } from '../src/lib/weekAgenda'

// Storage keys must match src/data/persistence.ts.
const ROLE_KEY = 'fundavida:v2:role'
const USER_KEY = 'fundavida:v2:current-user'

// A frozen epoch makes the seeded graph + clock deterministic (ADR-0014). The
// app's clock.today() resolves to startOfDay(EPOCH), so EPOCH must be the SAME
// Monday the spec derives its "week of" expectations from — using two
// different dates here was the seed-graph/clock mismatch that broke the first
// pass of this spec (course terms are generated epoch-relative, ADR-0002, so a
// different epoch reseeds different term windows entirely).
const EPOCH = new Date(2026, 5, 15, 12, 0, 0) // Monday, June 15, 2026, noon local
const NOW = new Date(2026, 5, 15) // the same calendar day, at local midnight

type Snapshot = ReturnType<typeof seedDemo>

const seedSnapshot = seedDemo(EPOCH)

// cou-13 (Música Secundaria, Hatillo, taught by tea-5) meets Mon/Wed and has
// two sessions in the week of June 15 in this exact seed, one of them past
// and unmarked (so the teacher's needs-marking bucket has a real deep link).
// tcu-15 is the volunteer assigned to it (ADR-0036); stu-38 is enrolled with
// real prior attendance. All are pre-existing seed anchors — no synthetic
// enrollment injection needed. Anchors are asserted, not assumed: a seed
// change that moves this course's term or roster fails loudly below rather
// than producing a silently-wrong spec.
const COURSE_ID = 'cou-13'
const TEACHER_ID = 'tea-5'
const TCU_ID = 'tcu-15'
const STUDENT_ID = 'stu-38'

const course = seedSnapshot.courses.find((c) => c.id === COURSE_ID)
if (!course) throw new Error(`seed drift: ${COURSE_ID} missing`)
if (course.teacherId !== TEACHER_ID) {
  throw new Error(`seed drift: ${COURSE_ID} is no longer taught by ${TEACHER_ID}`)
}
const tcuTrainee = seedSnapshot.tcuTrainees.find((t) => t.id === TCU_ID)
if (!tcuTrainee || tcuTrainee.courseId !== COURSE_ID) {
  throw new Error(`seed drift: ${TCU_ID} is no longer assigned to ${COURSE_ID}`)
}
const studentEnrollment = seedSnapshot.enrollments.find(
  (e) => e.studentId === STUDENT_ID && e.courseId === COURSE_ID && e.status === 'approved'
)
if (!studentEnrollment) {
  throw new Error(`seed drift: ${STUDENT_ID} is no longer approved-enrolled in ${COURSE_ID}`)
}

// The card's short title (Program + Level + cohort, no Sede) — what SessionCard
// renders. The sidebar's "needs marking"/"upcoming" rows use the full
// courseName instead (course.name, with Sede) — the two surfaces render
// different strings for the same Course, so each assertion targets the right one.
const COURSE_SHORT = shortCourseName(course)
const COURSE_FULL = course.name

// Derive the week-of-June-15 session count from the same lib the app uses,
// rather than hardcoding it — so a seed/lib change can't silently desync the spec.
const weekDays = weekAgendaDays([course], NOW)
const weekSessionCount = weekDays.reduce((sum, d) => sum + d.sessions.length, 0)
if (weekSessionCount === 0) {
  throw new Error(`seed drift: ${COURSE_ID} has no sessions in the week of ${NOW.toDateString()}`)
}

// Two weeks forward must still land inside the course's term so the
// prev/next-navigation spec has something to assert on both sides.
const twoWeeksLater = new Date(2026, 5, 29)
const laterWeekSessionCount = weekAgendaDays([course], twoWeeksLater).reduce(
  (sum, d) => sum + d.sessions.length,
  0
)
if (laterWeekSessionCount === 0) {
  throw new Error(`seed drift: ${COURSE_ID} has no sessions two weeks after ${NOW.toDateString()}`)
}

async function seedAndEnter(page: Page, snapshot: Snapshot, role: string, userId: string) {
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
  await page.goto('/app/calendar')
}

test.describe('calendar week agenda (ADR-0038)', () => {
  test('a student sees their enrolled course’s week agenda, read-only', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'student', STUDENT_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    // The week canvas renders the enrolled course's sessions this week (short title).
    await expect(page.getByText(COURSE_SHORT, { exact: true }).first()).toBeVisible()
    // Read-only: a student's card is never a link into Mark Attendance.
    await expect(page.getByRole('main').getByRole('link', { name: COURSE_SHORT })).toHaveCount(0)

    // The sidebar carries "My progress" (present/total), not a needs-marking worklist.
    await expect(page.getByRole('heading', { name: 'My progress' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Needs marking' })).toHaveCount(0)
  })

  test('a teacher sees their taught course linked into Mark Attendance, with a needs-marking worklist', async ({
    page,
  }) => {
    await seedAndEnter(page, seedSnapshot, 'teacher', TEACHER_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Needs marking' })).toBeVisible()

    // The sidebar's needs-marking row uses the full course name (with Sede).
    const sidebarLink = page.getByRole('link', { name: COURSE_FULL, exact: false })
    await expect(sidebarLink.first()).toBeVisible()
    const sidebarHref = await sidebarLink.first().getAttribute('href')
    expect(sidebarHref).toMatch(new RegExp(`/app/courses/${COURSE_ID}/sessions/.*/mark`))

    // The week canvas also renders a card for the taught course (short title),
    // deep-linked into Mark Attendance.
    const cardLink = page.getByRole('main').getByRole('link', { name: COURSE_SHORT })
    await expect(cardLink.first()).toBeVisible()
    const cardHref = await cardLink.first().getAttribute('href')
    expect(cardHref).toMatch(new RegExp(`/app/courses/${COURSE_ID}/sessions/.*/mark`))
  })

  test('a tcu volunteer sees a read-only schedule for their one assigned course (ADR-0036)', async ({
    page,
  }) => {
    await seedAndEnter(page, seedSnapshot, 'tcu', TCU_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible()
    // No teacher/admin buckets — read-only (ADR-0036).
    await expect(page.getByRole('heading', { name: 'Needs marking' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Operational pulse' })).toHaveCount(0)
    // No action links anywhere in the page's main content (the agenda surface) —
    // scoped to `main` so the app-shell nav/footer links (always present) don't
    // inflate the count.
    await expect(page.getByRole('main').getByRole('link')).toHaveCount(0)
  })

  test('an admin sees every scoped course’s sessions and an operational pulse', async ({
    page,
  }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Operational pulse' })).toBeVisible()
    await expect(page.getByText(COURSE_SHORT, { exact: true }).first()).toBeVisible()
  })

  test('the Week|Month toggle switches to CalendarWidget month mode', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await expect(page.getByText(COURSE_SHORT, { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Month', exact: true }).click()

    // CalendarWidget renders a month heading like "June 2026".
    await expect(page.getByRole('heading', { name: 'June 2026' })).toBeVisible()
  })

  test('prev/next week navigation updates the visible sessions', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    const canvasLinks = page.getByRole('main').getByRole('link', { name: COURSE_SHORT })
    await expect(canvasLinks.first()).toBeVisible()
    const beforeHref = await canvasLinks.first().getAttribute('href')

    // Two weeks forward moves past this Mon/Wed course's June 15 cards (it still
    // meets, but the specific date-stamped Mark links must change).
    await page.getByRole('button', { name: 'Next week' }).click()
    await page.getByRole('button', { name: 'Next week' }).click()

    await expect(canvasLinks.first()).toBeVisible()
    const afterHref = await canvasLinks.first().getAttribute('href')
    expect(afterHref).not.toBe(beforeHref)
  })
})
