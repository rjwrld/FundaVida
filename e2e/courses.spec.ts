import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'
import { shortCourseName } from '../src/lib/courseName'
import { courseDisplayState, isOpenForEnrollment } from '../src/lib/courseDisplayState'
import { landingPathForRole } from '../src/lib/roleLanding'
import { setDemoEpoch } from '../src/lib/clock'
import { fullName } from '../src/lib/personName'

// A clean browseable course for the student persona (stu-1, Linda Vista / primaria)
// with no prior enrollment AND still open for enrollment (ADR-0042) — so the request
// flow below is a fresh request that the term-end gate accepts and the Request button
// renders. Derived from the seed (faker.seed(42); the floating month matches the app
// because both seed at wall-time).
const browseWorld = seedDemo(new Date())
const browseNow = new Date()
const stu1Enrolled = new Set(
  browseWorld.enrollments.filter((e) => e.studentId === 'stu-1').map((e) => e.courseId)
)
const cleanBrowseCourse = browseWorld.courses.find(
  (c) =>
    c.status === 'published' &&
    isOpenForEnrollment(c, browseNow) &&
    c.sede === 'Linda Vista' &&
    c.level === 'primaria' &&
    !stu1Enrolled.has(c.id)
)
if (!cleanBrowseCourse) throw new Error('seed has no clean open browseable course for stu-1')

// A published cohort at stu-1's Sede/level whose Term has already ended (ADR-0042):
// still viewable (its "Term ended" badge shows) but no longer open for enrollment,
// so it must NOT appear in the "Browse open courses" list (issue #257).
const termEndedBrowseCourse = browseWorld.courses.find(
  (c) =>
    c.status === 'published' &&
    courseDisplayState(c, browseNow) === 'termEnded' &&
    c.sede === 'Linda Vista' &&
    c.level === 'primaria' &&
    !stu1Enrolled.has(c.id)
)
if (!termEndedBrowseCourse) throw new Error('seed has no Term-ended browseable course for stu-1')

// A still-published, already-ended course owned by the teacher persona (tea-1) with
// an approved Student. A Teacher may only grade an owned, ended, published cohort —
// a closed one is locked (ADR-0025) — so target one explicitly rather than "the
// first course in the list", which may be a completed (closed) cohort.
const teacherNow = new Date()
const teacherGradableCourse = browseWorld.courses.find(
  (c) =>
    c.status === 'published' &&
    c.teacherId === 'tea-1' &&
    new Date(c.term.end) <= teacherNow &&
    browseWorld.enrollments.some((e) => e.courseId === c.id && e.status === 'approved')
)
if (!teacherGradableCourse) throw new Error('seed has no gradable published, ended tea-1 course')

// A seeded volunteer (TCU trainee) and the Course they are assigned to, so the
// Course detail page renders both the derived Sessions surface and a populated
// Volunteers section. Names are localized in the seed, matching what the app renders.
const seedVolunteer = browseWorld.tcuTrainees[0]
if (!seedVolunteer) throw new Error('seed has no TCU trainees')
const volunteerCourse = browseWorld.courses.find((c) => c.id === seedVolunteer.courseId)
if (!volunteerCourse) throw new Error('seed volunteer has no assigned course')

// The teacher persona's golden-path landing (#72): switching to teacher drops onto its
// ungraded ended Course. Derived by running the real landing lib over the seed so the
// expected id can never drift from what the app computes. landingPathForRole reads the
// clock seam (via the enter-grades predicate), which defaults to 1970 in a Node module —
// pin it to this world's epoch so "ended" is judged on the same timeline the app uses.
setDemoEpoch(browseWorld.demoEpoch)
const teacherLandingPath = landingPathForRole('teacher', {
  courses: browseWorld.courses,
  enrollments: browseWorld.enrollments,
  grades: browseWorld.grades,
  currentUserId: 'tea-1',
})
if (!teacherLandingPath.startsWith('/app/courses/')) {
  throw new Error('seed should give the teacher a golden-path course landing')
}
const teacherGoldenCourse = browseWorld.courses.find(
  (c) => c.id === teacherLandingPath.split('/').pop()
)
if (!teacherGoldenCourse) throw new Error('teacher golden-path course not found in seed')

// A course the teacher does NOT own — the starting detail page for the role-switch
// stranding repro (#415). Admin can view any course, so this is a valid admin start.
const notTeacherCourse = browseWorld.courses.find(
  (c) => c.teacherId !== 'tea-1' && c.id !== teacherGoldenCourse.id
)
if (!notTeacherCourse) throw new Error('seed should have a course tea-1 does not own')

// A Course the Student persona (stu-1) is actively enrolled in, so its detail page is
// viewable for a Student — the starting point for the "any course detail page" AC (#415).
const studentCourse = browseWorld.courses.find((c) =>
  browseWorld.enrollments.some(
    (e) =>
      e.studentId === 'stu-1' &&
      e.courseId === c.id &&
      (e.status === 'approved' || e.status === 'pending')
  )
)
if (!studentCourse) throw new Error('seed should leave stu-1 an active enrollment')

test('teacher grades a student in their course', async ({ page }) => {
  await enterAs(page, 'teacher')
  await page.goto(`/app/courses/${teacherGradableCourse.id}`)
  await expect(
    page.getByRole('heading', { name: shortCourseName(teacherGradableCourse) })
  ).toBeVisible()

  // Click Grade on the first enrolled student
  await page.getByRole('button', { name: 'Grade' }).first().click()

  // The dialog heading reads "Grade <student name>" — capture who we are grading
  // so the assertion can be scoped to their row (other seeded students may share
  // the same score).
  const gradeHeading = page.getByRole('heading', { name: /^Grade / })
  await expect(gradeHeading).toBeVisible()
  const studentName = ((await gradeHeading.textContent()) ?? '').replace(/^Grade\s+/, '').trim()

  // Enter a score and save
  await page.getByLabel('Score').fill('92')
  await page.getByRole('button', { name: 'Save grade' }).click()

  // Dialog closes, and the graded student's row now shows the saved score.
  await expect(gradeHeading).toBeHidden()
  await expect(
    page.getByRole('row').filter({ hasText: studentName }).getByText('92.0')
  ).toBeVisible()
})

test('course detail shows the derived Sessions surface and assigned Volunteers (issue 153, ADR-0037)', async ({
  page,
}) => {
  await enterAs(page, 'admin')
  await page.goto(`/app/courses/${volunteerCourse.id}`)
  await expect(page.getByRole('heading', { name: shortCourseName(volunteerCourse) })).toBeVisible()

  // Sessions: the one state-grouped surface (ADR-0037) replaces the old Schedule
  // wall. This ended cohort's past Sessions surface as an expanded Needs-attendance
  // queue, so at least one Session row is visible.
  const sessionsSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Sessions' }) })
  await expect(sessionsSection.getByRole('listitem').first()).toBeVisible()

  // Volunteers: the assigned TCU trainee is listed for this Course.
  const volunteersSection = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Volunteers' }) })
  await expect(volunteersSection.getByText(fullName(seedVolunteer))).toBeVisible()
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Cursos' }).click()
  await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar curso' })).toBeVisible()
})

test('student requests a course and withdraws the request without reload (ADR-0016)', async ({
  page,
}) => {
  await enterAs(page, 'student')
  // The dashboard's browse shortcut card is gone (ADR-0043); the browse-and-request
  // entry now lives on the Courses page.
  await page.goto('/app/courses')
  await page.getByRole('link', { name: 'Browse open courses' }).click()
  await expect(page.getByRole('heading', { name: 'Browse courses' })).toBeVisible()

  // Open a clean browseable course (no prior enrollment for stu-1) so this exercises
  // a fresh request rather than a re-request of a rejected/withdrawn cohort. Each
  // row's name is a button (not a link) that navigates to the read-only detail.
  await page.getByRole('table').getByRole('button', { name: cleanBrowseCourse.name }).click()

  // The browse list shows the full name; the detail heading shows the
  // Sede-stripped display name (ADR-0021).
  await expect(
    page.getByRole('heading', { name: shortCourseName(cleanBrowseCourse) })
  ).toBeVisible()

  // Request a spot
  const requestButton = page.getByRole('button', { name: 'Request a spot' })
  await expect(requestButton).toBeVisible()
  await requestButton.click()

  // The request section flips to the pending state without a page reload
  await expect(requestButton).toBeHidden()
  await expect(page.getByText('Request pending')).toBeVisible()

  // Withdraw the request
  const withdrawButton = page.getByRole('button', { name: 'Withdraw request' })
  await expect(withdrawButton).toBeVisible()
  await withdrawButton.click()

  // Back to the request state (again, no reload)
  await expect(withdrawButton).toBeHidden()
  await expect(requestButton).toBeVisible()
})

test('Browse list surfaces only open courses — a Term-ended cohort is hidden yet still viewable (ADR-0042, issue #257)', async ({
  page,
}) => {
  await enterAs(page, 'student')
  await page.goto('/app/courses')
  await page.getByRole('link', { name: 'Browse open courses' }).click()
  await expect(page.getByRole('heading', { name: 'Browse courses' })).toBeVisible()

  const table = page.getByRole('table')
  // An open cohort lists (waits for the table to populate)…
  await expect(table.getByRole('button', { name: cleanBrowseCourse.name })).toBeVisible()
  // …but the Term-ended cohort — the list is literally titled "open courses" — does not.
  await expect(table.getByRole('button', { name: termEndedBrowseCourse.name })).toHaveCount(0)

  // Its detail nonetheless stays viewable: the badge shows and the request action
  // is gone. View access must not collapse when the enrollment window closes.
  await page.goto(`/app/courses/${termEndedBrowseCourse.id}`)
  await expect(
    page.getByRole('heading', { name: shortCourseName(termEndedBrowseCourse) })
  ).toBeVisible()
  await expect(page.getByText('Term ended')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request a spot' })).toHaveCount(0)
})

test('student can re-request a course after withdrawing the prior request', async ({ page }) => {
  await enterAs(page, 'student')
  await page.goto('/app/courses')
  await page.getByRole('link', { name: 'Browse open courses' }).click()
  await expect(page.getByRole('heading', { name: 'Browse courses' })).toBeVisible()

  // Open the clean, still-open browseable course so the Request button renders
  // (a Term-ended course would hide it — ADR-0042).
  await page.getByRole('table').getByRole('button', { name: cleanBrowseCourse.name }).click()

  // Request a spot, then withdraw it — leaving a withdrawn enrollment on record.
  const requestButton = page.getByRole('button', { name: 'Request a spot' })
  await requestButton.click()
  await expect(page.getByText('Request pending')).toBeVisible()

  const withdrawButton = page.getByRole('button', { name: 'Withdraw request' })
  await withdrawButton.click()
  await expect(requestButton).toBeVisible()

  // Re-request the same (now withdrawn) course: previously this silently no-opped
  // because requestEnrollment returned the stale withdrawn record. It must now flip
  // back to pending.
  await requestButton.click()
  await expect(requestButton).toBeHidden()
  await expect(page.getByText('Request pending')).toBeVisible()
})

// Switching role while on a Course detail page, to a role that lands on a *different*
// Course detail, previously stranded the page on the old id (#415). The destination
// matches the same `courses/:id` route, and `setRole` (a useSyncExternalStore write)
// could flush its own commit *before* the router's location update — that stale render
// paired the new role with the previous `:id`, read a null course the new role can't
// see, and — frozen by the outlet's AnimatePresence exit — stuck on the empty
// "Course / Back to home" fallback. `SidebarUser.pick` now wraps the role flip and the
// navigation in a single `flushSync` commit, so no render pairs the new role with the
// old id. This is a router/store re-render ordering race — unit tests miss it.
test('role switch from a course detail lands on the golden-path course fully rendered', async ({
  page,
}) => {
  // Admin, on a course the teacher does NOT own.
  await enterAs(page, 'admin')
  await page.goto(`/app/courses/${notTeacherCourse.id}`)
  await expect(page.getByRole('heading', { name: shortCourseName(notTeacherCourse) })).toBeVisible()

  // Switch to Teacher from the sidebar footer — lands on the teacher's golden-path course.
  await page.getByRole('button', { name: 'Admin' }).click()
  await page.getByRole('menuitem', { name: 'Teacher' }).click()

  // URL is the new course, and its body renders fully (its heading, not the fallback).
  await expect(page).toHaveURL(new RegExp(`/app/courses/${teacherGoldenCourse.id}$`))
  await expect(
    page.getByRole('heading', { name: shortCourseName(teacherGoldenCourse) })
  ).toBeVisible()

  // The empty "Back to home" fallback must never be what the user is left on.
  await expect(page.getByRole('link', { name: 'Back to home' })).toHaveCount(0)
})

// AC: "the same holds for a role switch from ANY course detail page." A Student viewing
// their own enrolled Course detail switches to Teacher and must land on the golden-path
// course fully rendered — not just from the Admin start above.
test('role switch to Teacher from a Student course detail also lands fully rendered', async ({
  page,
}) => {
  await enterAs(page, 'student')
  await page.goto(`/app/courses/${studentCourse.id}`)
  await expect(page.getByRole('heading', { name: shortCourseName(studentCourse) })).toBeVisible()

  const trigger = page.getByRole('button').filter({ hasText: 'Student' })
  await trigger.click()
  await page.getByRole('menuitem', { name: 'Teacher' }).click()

  await expect(page).toHaveURL(new RegExp(`/app/courses/${teacherGoldenCourse.id}$`))
  await expect(
    page.getByRole('heading', { name: shortCourseName(teacherGoldenCourse) })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to home' })).toHaveCount(0)
})

// AC: "Student / TCU / Admin role switches from a course detail page still land on /app
// (unchanged)." `pick()` was touched for every role, so guard the /app-landing path from
// a course detail starting point too — it must unmount to the dashboard, not strand.
test('role switch to a dashboard-landing role from a course detail lands on /app', async ({
  page,
}) => {
  await enterAs(page, 'teacher')
  await page.goto(`/app/courses/${teacherGoldenCourse.id}`)
  await expect(
    page.getByRole('heading', { name: shortCourseName(teacherGoldenCourse) })
  ).toBeVisible()

  const trigger = page.getByRole('button').filter({ hasText: 'Teacher' })
  await trigger.click()
  await page.getByRole('menuitem', { name: 'Student' }).click()

  await expect(page).toHaveURL(/\/app$/)
  // The Student's dashboard renders — its self-service nav entry is Student-only.
  await expect(page.getByRole('link', { name: 'My profile' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to home' })).toHaveCount(0)
})
