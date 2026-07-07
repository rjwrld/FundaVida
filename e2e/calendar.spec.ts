import { test, expect, type Page } from '@playwright/test'
import { seedDemo } from '../src/data/seed'
import { shortCourseName } from '../src/lib/courseName'
import { weekAgendaDays } from '../src/lib/weekAgenda'

// Storage keys must match src/data/persistence.ts.
const STATE_KEY = 'fundavida:v10:state'
const ROLE_KEY = 'fundavida:v2:role'
const USER_KEY = 'fundavida:v2:current-user'

// A frozen epoch makes the seeded graph + clock deterministic (ADR-0014). "Now"
// lands on a Monday so the default week view opens on a known Mon-Sun range.
const EPOCH = new Date('2026-06-01T12:00:00.000Z')
const NOW = new Date(2026, 5, 15) // Monday, June 15, 2026 (within the epoch's "today")

type Snapshot = ReturnType<typeof seedDemo>

// tea-1 (Jessica Marin, Linda Vista) teaches cou-19 — a published Mon/Wed
// cohort whose term covers the week of June 15 — in the base seed already.
// stu-1 (Linda Vista/primaria) has no enrollment in it by default, so we inject
// one: this makes the student role's week agenda deterministic without
// hardcoding faker-derived enrollment ids, which drift across reseeds.
const TEACHER_ID = 'tea-1'
const STUDENT_ID = 'stu-1'
const TCU_ID = 'tcu-1'
const COURSE_ID = 'cou-19'
const ENROLLMENT_ID = 'enr-e2e-calendar'

function buildSnapshot(): Snapshot {
  const snap = seedDemo(EPOCH)
  const course = snap.courses.find((c) => c.id === COURSE_ID)
  if (!course) throw new Error(`seed must include ${COURSE_ID}`)
  if (course.teacherId !== TEACHER_ID) {
    throw new Error(`seed drift: ${COURSE_ID} is no longer taught by ${TEACHER_ID}`)
  }
  const student = snap.students.find((s) => s.id === STUDENT_ID)
  if (!student) throw new Error(`seed must include ${STUDENT_ID}`)
  if (student.sede !== course.sede) {
    throw new Error('seed drift: student/course Sede mismatch (ADR-0011)')
  }

  snap.enrollments.push({
    id: ENROLLMENT_ID,
    studentId: STUDENT_ID,
    courseId: COURSE_ID,
    enrolledAt: EPOCH.toISOString(),
    status: 'approved',
    requestedAt: EPOCH.toISOString(),
  })

  return snap
}

const seedSnapshot = buildSnapshot()
const course = seedSnapshot.courses.find((c) => c.id === COURSE_ID)
if (!course) throw new Error(`seed must include ${COURSE_ID}`)
const COURSE_SHORT = shortCourseName(course)

// Derive the week-of-June-15 session count from the same lib the app uses,
// rather than hardcoding it — so a seed/lib change can't silently desync the spec.
const weekDays = weekAgendaDays([course], NOW)
const weekSessionCount = weekDays.reduce((sum, d) => sum + d.sessions.length, 0)
if (weekSessionCount === 0) {
  throw new Error(`seed drift: ${COURSE_ID} has no sessions in the week of ${NOW.toDateString()}`)
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
    // The week canvas renders the enrolled course's sessions this week.
    await expect(page.getByText(COURSE_SHORT).first()).toBeVisible()
    // Read-only: a student's card is never a link into Mark Attendance.
    await expect(page.getByRole('link', { name: new RegExp(COURSE_SHORT) })).toHaveCount(0)

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

    // At least one card for the taught course deep-links into Mark Attendance.
    const links = page.getByRole('link', { name: new RegExp(COURSE_SHORT) })
    await expect(links.first()).toBeVisible()
    const href = await links.first().getAttribute('href')
    expect(href).toMatch(new RegExp(`/app/courses/${COURSE_ID}/sessions/.*/mark`))
  })

  test('a tcu volunteer sees a read-only schedule for their one assigned course (ADR-0036)', async ({
    page,
  }) => {
    const tcuTrainee = seedSnapshot.tcuTrainees.find((t) => t.id === TCU_ID)
    if (!tcuTrainee) test.skip(true, 'seed must include tcu-1')

    await seedAndEnter(page, seedSnapshot, 'tcu', TCU_ID)

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible()
    // No teacher/admin buckets, and no action links — read-only (ADR-0036).
    await expect(page.getByRole('heading', { name: 'Needs marking' })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Operational pulse' })).toHaveCount(0)
    await expect(page.getByRole('link')).toHaveCount(0)
  })

  test('an admin sees every scoped course’s sessions and an operational pulse', async ({
    page,
  }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await expect(page.getByRole('heading', { name: 'Calendar' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Operational pulse' })).toBeVisible()
    await expect(page.getByText(COURSE_SHORT).first()).toBeVisible()
  })

  test('the Week|Month toggle switches to CalendarWidget month mode', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await expect(page.getByText(COURSE_SHORT).first()).toBeVisible()
    await page.getByRole('button', { name: 'Month', exact: true }).click()

    // CalendarWidget renders a month heading like "June 2026".
    await expect(page.getByRole('heading', { name: 'June 2026' })).toBeVisible()
  })

  test('prev/next week navigation updates the visible sessions', async ({ page }) => {
    await seedAndEnter(page, seedSnapshot, 'admin', 'admin')

    await expect(page.getByText(COURSE_SHORT).first()).toBeVisible()
    // Two weeks forward moves past this Mon/Wed course's June cards (it still
    // meets, but the specific date-stamped Mark links must change).
    const beforeHref = await page
      .getByRole('link', { name: new RegExp(COURSE_SHORT) })
      .first()
      .getAttribute('href')

    await page.getByRole('button', { name: 'Next week' }).click()
    await page.getByRole('button', { name: 'Next week' }).click()

    const afterHref = await page
      .getByRole('link', { name: new RegExp(COURSE_SHORT) })
      .first()
      .getAttribute('href')
    expect(afterHref).not.toBe(beforeHref)
  })
})
