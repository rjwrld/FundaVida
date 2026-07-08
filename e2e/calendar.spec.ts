import { test, expect, type Page } from '@playwright/test'
import { seedDemo } from '../src/data/seed'
import { STATE_KEY } from '../src/data/persistence'
import { shortCourseName } from '../src/lib/courseName'
import { weekAgendaDays } from '../src/lib/weekAgenda'
import { buildAgenda } from '../src/lib/agenda'

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

// Every persona lands on a live current week by construction (ADR-0044), so the
// spec anchors on the personas themselves — not a hand-picked cohort that a
// reseed can move (the tcu-15/cou-13 drift class). All anchors are DERIVED from
// seedDemo() below and asserted, so a seed change that empties a persona's week
// fails loudly here rather than producing a silently-wrong spec.
const TEACHER_ID = 'tea-1'
const STUDENT_ID = 'stu-1'
const TCU_ID = 'tcu-1'

// Total Sessions the given Courses have in the week containing `date` (default
// NOW) — the same lib the app renders the canvas from.
const weekSessionCount = (courseIds: string[], date: Date = NOW) =>
  weekAgendaDays(
    seedSnapshot.courses.filter((c) => courseIds.includes(c.id)),
    date,
    seedSnapshot.sessionExceptions
  ).reduce((sum, d) => sum + d.sessions.length, 0)

// The shared teacher↔student anchor: the teacher persona's live cohort that the
// student persona is also approved-enrolled in (the reassigned plan-10 course).
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
const COURSE_SHORT = shortCourseName(sharedCourse)
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
  !teacherAgenda.needsMarking.some((s) => s.courseId === SHARED_COURSE_ID)
) {
  throw new Error(`seed drift: ${SHARED_COURSE_ID} is not in tea-1's needs-marking worklist`)
}

// The TCU persona's pinned live cohort (ADR-0044): a read-only anchor.
const tcuTrainee = seedSnapshot.tcuTrainees.find((t) => t.id === TCU_ID)
if (!tcuTrainee) throw new Error(`seed drift: ${TCU_ID} missing`)
const tcuCourse = seedSnapshot.courses.find((c) => c.id === tcuTrainee.courseId)
if (!tcuCourse || weekSessionCount([tcuCourse.id]) === 0) {
  throw new Error(`seed drift: ${TCU_ID} is not pinned to a Course with sessions this week`)
}
const TCU_COURSE_SHORT = shortCourseName(tcuCourse)

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
  // The load-bearing guarantee: a portfolio reviewer opening the calendar as any
  // of the four roles sees a populated current week, never an empty grid. Counts
  // are derived (roleWeekCounts) and asserted non-empty at module load; here we
  // prove the rendered canvas actually shows a card for each role.
  for (const { role, userId, anchor } of [
    { role: 'teacher', userId: TEACHER_ID, anchor: COURSE_SHORT },
    { role: 'student', userId: STUDENT_ID, anchor: COURSE_SHORT },
    { role: 'tcu', userId: TCU_ID, anchor: TCU_COURSE_SHORT },
    { role: 'admin', userId: 'admin', anchor: COURSE_SHORT },
  ] as const) {
    test(`a ${role} lands on a non-empty current week`, async ({ page }) => {
      await seedAndEnter(page, seedSnapshot, role, userId)
      await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
      await expect(page.getByText(anchor, { exact: true }).first()).toBeVisible()
    })
  }
})

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
    expect(sidebarHref).toMatch(new RegExp(`/app/courses/${SHARED_COURSE_ID}/sessions/.*/mark`))

    // The week canvas also renders a card for the taught course (short title),
    // deep-linked into Mark Attendance.
    const cardLink = page.getByRole('main').getByRole('link', { name: COURSE_SHORT })
    await expect(cardLink.first()).toBeVisible()
    const cardHref = await cardLink.first().getAttribute('href')
    expect(cardHref).toMatch(new RegExp(`/app/courses/${SHARED_COURSE_ID}/sessions/.*/mark`))
  })

  test('a tcu volunteer sees a read-only schedule for their one assigned course (ADR-0036)', async ({
    page,
  }) => {
    await seedAndEnter(page, seedSnapshot, 'tcu', TCU_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible()
    // The pinned live cohort's card is on the canvas this week (ADR-0044).
    await expect(page.getByText(TCU_COURSE_SHORT, { exact: true }).first()).toBeVisible()
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

    // Two weeks forward keeps the course on-canvas (still within term) but the
    // specific date-stamped Mark links must change.
    await page.getByRole('button', { name: 'Next week' }).click()
    await page.getByRole('button', { name: 'Next week' }).click()

    await expect(canvasLinks.first()).toBeVisible()
    const afterHref = await canvasLinks.first().getAttribute('href')
    expect(afterHref).not.toBe(beforeHref)
  })
})
