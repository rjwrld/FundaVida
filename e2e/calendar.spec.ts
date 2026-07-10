import { test, expect, type Page } from '@playwright/test'
import { seedDemo } from '../src/data/seed'
import { STATE_KEY } from '../src/data/persistence'
import { calendarCardName } from '../src/lib/courseName'
import { weekAgendaDays } from '../src/lib/weekAgenda'
import { buildAgenda } from '../src/lib/agenda'

// Storage keys must match src/data/persistence.ts.
const ROLE_KEY = 'fundavida:v2:role'
const USER_KEY = 'fundavida:v2:current-user'

// A frozen epoch makes the seeded graph + clock deterministic (ADR-0014). The
// app's clock.today() resolves to startOfDay(EPOCH), so EPOCH must be the SAME
// Monday the spec derives its "week of" expectations from.
const EPOCH = new Date(2026, 5, 15, 12, 0, 0) // Monday, June 15, 2026, noon local
const NOW = new Date(2026, 5, 15) // the same calendar day, at local midnight

type Snapshot = ReturnType<typeof seedDemo>

const seedSnapshot = seedDemo(EPOCH)

// Every persona lands on a live current week by construction (ADR-0044), so the
// spec anchors on the personas themselves — not a hand-picked cohort a reseed
// can move. All anchors are DERIVED from seedDemo() below and asserted, so a
// seed change that empties a persona's week fails loudly here.
const TEACHER_ID = 'tea-1'
const STUDENT_ID = 'stu-1'
const TCU_ID = 'tcu-1'

// Total Sessions the given Courses have in the week containing `date`.
const weekSessionCount = (courseIds: string[], date: Date = NOW) =>
  weekAgendaDays(
    seedSnapshot.courses.filter((c) => courseIds.includes(c.id)),
    date,
    seedSnapshot.sessionExceptions
  ).reduce((sum, d) => sum + d.sessions.length, 0)

// The shared teacher↔student anchor: the teacher persona's live cohort the
// student persona is also approved-enrolled in.
const sharedCourse = seedSnapshot.courses.find(
  (c) =>
    c.teacherId === TEACHER_ID &&
    seedSnapshot.enrollments.some(
      (e) => e.studentId === STUDENT_ID && e.courseId === c.id && e.status === 'approved'
    ) &&
    weekSessionCount([c.id]) > 0
)
if (!sharedCourse) {
  throw new Error('seed drift: no live tea-1 cohort that stu-1 is approved-enrolled in this week')
}
const SHARED_COURSE_ID = sharedCourse.id
// The de-suffixed name the card + sidebar rows now render (ADR-0044).
const COURSE_CARD = calendarCardName(sharedCourse)
const COURSE_FULL = sharedCourse.name

// The teacher's needs-marking worklist must carry this course (the sidebar deep
// link the teacher test asserts). Derived from the same lib the sidebar uses.
const teacherAgenda = buildAgenda({
  role: 'teacher',
  courses: seedSnapshot.courses.filter((c) => c.teacherId === TEACHER_ID),
  attendance: seedSnapshot.attendance,
  grades: seedSnapshot.grades,
  enrollments: seedSnapshot.enrollments,
  certificates: seedSnapshot.certificates,
  sessionExceptions: seedSnapshot.sessionExceptions,
  now: EPOCH,
})
if (
  teacherAgenda.role !== 'teacher' ||
  !teacherAgenda.worklist.some((g) => g.courseId === SHARED_COURSE_ID)
) {
  throw new Error(`seed drift: ${SHARED_COURSE_ID} is not in tea-1's worklist`)
}

// The TCU persona's pinned live cohort (ADR-0044): a read-only anchor.
const tcuTrainee = seedSnapshot.tcuTrainees.find((t) => t.id === TCU_ID)
if (!tcuTrainee) throw new Error(`seed drift: ${TCU_ID} missing`)
const tcuCourse = seedSnapshot.courses.find((c) => c.id === tcuTrainee.courseId)
if (!tcuCourse || weekSessionCount([tcuCourse.id]) === 0) {
  throw new Error(`seed drift: ${TCU_ID} is not pinned to a Course with sessions this week`)
}
const TCU_COURSE_CARD = calendarCardName(tcuCourse)

// Each persona lands on a NON-EMPTY current week — the load-bearing ADR-0044
// guarantee. Derived per role from the same lib the app renders from.
const teacherCourseIds = seedSnapshot.courses
  .filter((c) => c.teacherId === TEACHER_ID)
  .map((c) => c.id)
const studentCourseIds = seedSnapshot.enrollments
  .filter((e) => e.studentId === STUDENT_ID && e.status === 'approved')
  .map((e) => e.courseId)
const roleWeekCounts = {
  teacher: weekSessionCount(teacherCourseIds),
  student: weekSessionCount(studentCourseIds),
  tcu: weekSessionCount([tcuCourse.id]),
  admin: weekSessionCount(seedSnapshot.courses.map((c) => c.id)),
}
for (const [role, count] of Object.entries(roleWeekCounts)) {
  if (count === 0) throw new Error(`seed drift: ${role} lands on an empty current week`)
}

// Two weeks forward must still land inside the shared course's term so the
// prev/next-navigation spec has something to assert on both sides.
const twoWeeksLater = new Date(2026, 5, 29)
if (weekSessionCount([SHARED_COURSE_ID], twoWeeksLater) === 0) {
  throw new Error(
    `seed drift: ${SHARED_COURSE_ID} has no sessions two weeks after ${NOW.toDateString()}`
  )
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

test.describe('calendar liveliness — every persona lands on a live week (ADR-0044)', () => {
  for (const { role, userId, anchor } of [
    { role: 'teacher', userId: TEACHER_ID, anchor: COURSE_CARD },
    { role: 'student', userId: STUDENT_ID, anchor: COURSE_CARD },
    { role: 'tcu', userId: TCU_ID, anchor: TCU_COURSE_CARD },
    { role: 'admin', userId: 'admin', anchor: COURSE_CARD },
  ] as const) {
    test(`a ${role} lands on a non-empty current week`, async ({ page }) => {
      await seedAndEnter(page, seedSnapshot, role, userId)
      await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
      await expect(page.getByText(anchor, { exact: true }).first()).toBeVisible()
    })
  }
})

test.describe('calendar role divergence (ADR-0044)', () => {
  test('a student sees their enrolled course’s week canvas, read-only', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'student', STUDENT_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByText(COURSE_CARD, { exact: true }).first()).toBeVisible()
    // Read-only: a student's canvas cards are never links into Mark Attendance.
    await expect(page.getByRole('main').getByRole('link', { name: COURSE_FULL })).toHaveCount(0)
    // The sidebar carries "My progress", not a needs-marking worklist.
    await expect(page.getByRole('heading', { name: 'My progress' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Needs marking' })).toHaveCount(0)
  })

  test('a teacher sees a grouped worklist + Mark-Attendance-linked cards', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'teacher', TEACHER_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Needs marking' })).toBeVisible()

    // The grouped worklist row deep-links to the oldest unmarked Session's mark page.
    const worklist = page.getByRole('region', { name: 'Needs marking' })
    const worklistLink = worklist.getByRole('link').first()
    await expect(worklistLink).toBeVisible()
    expect(await worklistLink.getAttribute('href')).toMatch(
      /\/app\/courses\/.*\/sessions\/.*\/mark/
    )

    // The week canvas card (accessible name = full canonical course name) is a
    // deep link into Mark Attendance too.
    const cardLink = page.getByRole('main').getByRole('link', { name: COURSE_FULL }).first()
    await expect(cardLink).toBeVisible()
    expect(await cardLink.getAttribute('href')).toMatch(
      new RegExp(`/app/courses/${SHARED_COURSE_ID}/sessions/.*/mark`)
    )
  })

  test('a tcu volunteer sees a read-only schedule for their assigned course (ADR-0036)', async ({
    page,
  }) => {
    await seedAndEnter(page, seedSnapshot, 'tcu', TCU_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible()
    await expect(page.getByText(TCU_COURSE_CARD, { exact: true }).first()).toBeVisible()
    // No teacher/admin buckets — read-only (ADR-0036).
    await expect(page.getByRole('heading', { name: 'Needs marking' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Operational pulse' })).toHaveCount(0)
    // No action links anywhere in the page's main content.
    await expect(page.getByRole('main').getByRole('link')).toHaveCount(0)
  })

  test('an admin sees every scoped course’s sessions and an operational pulse', async ({
    page,
  }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Operational pulse' })).toBeVisible()
    await expect(page.getByText(COURSE_CARD, { exact: true }).first()).toBeVisible()
  })
})

test.describe('calendar navigation (ADR-0044)', () => {
  test('the Week|Month toggle switches to the month navigator', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await expect(page.getByText(COURSE_CARD, { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Month', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'June 2026' })).toBeVisible()
    // Month is a navigator now — no day-detail "Sessions" panel below the grid.
    await expect(page.getByRole('heading', { name: 'Sessions' })).toHaveCount(0)
  })

  test('tapping a day in month mode jumps the week canvas to that week', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await page.getByRole('button', { name: 'Month', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'June 2026' })).toBeVisible()

    await page.getByRole('button', { name: /Monday, June 15th, 2026/ }).click()
    // Back on the week canvas: month heading gone, the week nav returns.
    await expect(page.getByRole('heading', { name: 'June 2026' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()
    await expect(page.getByText(COURSE_CARD, { exact: true }).first()).toBeVisible()
  })

  test('a day can be selected from the keyboard alone', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await page.getByRole('button', { name: 'Month', exact: true }).click()
    // The grid is a single tab stop landing on today (Mon, Jun 15); arrow keys
    // move the roving focus from there.
    await page.getByRole('button', { name: /Monday, June 15th, 2026/ }).focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('button', { name: /Tuesday, June 16th, 2026/ })).toBeFocused()

    await page.keyboard.press('Enter')
    // Enter is a navigator move, same as a tap: back on the week canvas.
    await expect(page.getByRole('heading', { name: 'June 2026' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()
  })

  test('prev/next week navigation updates the visible sessions', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    const canvasLinks = page.getByRole('main').getByRole('link', { name: COURSE_FULL })
    await expect(canvasLinks.first()).toBeVisible()
    const beforeHref = await canvasLinks.first().getAttribute('href')

    await page.getByRole('button', { name: 'Next week' }).click()
    await page.getByRole('button', { name: 'Next week' }).click()

    await expect(canvasLinks.first()).toBeVisible()
    const afterHref = await canvasLinks.first().getAttribute('href')
    expect(afterHref).not.toBe(beforeHref)
  })
})

test.describe('calendar quiet states + responsive (ADR-0044)', () => {
  test('marking the backlog shrinks the worklist to the caught-up state', async ({ page }) => {
    // Reduced motion removes the cards'/sidebar's entrance animation, so the
    // worklist row is stable to click the instant it renders (otherwise the
    // settling animation reads as "not stable" and the click retries forever).
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await seedAndEnter(page, seedSnapshot, 'teacher', TEACHER_ID)
    await expect(page.getByRole('heading', { name: 'Needs marking' })).toBeVisible()

    // Scope the caught-up assertion to the full sidebar's worklist section — the
    // one-row banner also carries an "All sessions marked" span but is hidden at
    // desktop width (lg:hidden), which a page-wide matcher would resolve to.
    const worklist = page.getByRole('region', { name: 'Needs marking' })
    const caughtUp = worklist.getByText('All sessions marked')
    // Clear the backlog one Course at a time via SPA navigation (a full reload
    // can't reach the mark URL — its ISO date's dot trips the dev server's
    // static-file fallback). Each worklist row deep-links to its oldest unmarked
    // Session; saving marks it and the row drops. Capped well above the seed's
    // single-digit backlog so a runaway never hangs CI.
    for (let i = 0; i < 25; i++) {
      await expect(worklist).toBeVisible()
      if (await caughtUp.isVisible().catch(() => false)) break

      const link = worklist.getByRole('link').first()
      if (!(await link.isVisible().catch(() => false))) break
      await link.click()
      await expect(page).toHaveURL(/\/mark$/)
      await page.getByRole('button', { name: /Save/i }).click()
      await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    }

    // The state a reviewer earns by clicking Mark and submitting real attendance.
    await expect(caughtUp).toBeVisible()
    await expect(worklist.getByText('Nothing pending in your courses.')).toBeVisible()
  })

  test('mobile viewport: the banner + canvas lead, the calendar is not buried', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await seedAndEnter(page, seedSnapshot, 'teacher', TEACHER_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    // The one-row action banner (role's top fact) is present at phone width.
    await expect(page.getByText(/sessions? to mark/).first()).toBeVisible()
    // The canvas card is on screen — the calendar is the hero, not buried.
    await expect(page.getByText(COURSE_CARD, { exact: true }).first()).toBeVisible()
  })
})
