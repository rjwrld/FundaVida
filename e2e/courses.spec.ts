import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'
import { shortCourseName } from '../src/lib/courseName'

// A clean browseable course for the student persona (stu-1, Linda Vista / primaria)
// with no prior enrollment — so the request flow below is a fresh request, not a
// re-request of stu-1's seeded rejected/withdrawn cohorts. Derived from the seed
// (faker.seed(42), epoch-independent structure; the floating month matches the app
// because both seed at wall-time).
const browseWorld = seedDemo(new Date())
const stu1Enrolled = new Set(
  browseWorld.enrollments.filter((e) => e.studentId === 'stu-1').map((e) => e.courseId)
)
const cleanBrowseCourse = browseWorld.courses.find(
  (c) =>
    c.status === 'published' &&
    c.sede === 'Linda Vista' &&
    c.level === 'primaria' &&
    !stu1Enrolled.has(c.id)
)
if (!cleanBrowseCourse) throw new Error('seed has no clean browseable course for stu-1')

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
  await expect(
    volunteersSection.getByText(`${seedVolunteer.firstName} ${seedVolunteer.lastName}`)
  ).toBeVisible()
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Cursos' }).click()
  await expect(page.getByRole('heading', { name: 'Cursos' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar curso' })).toBeVisible()
})

test('student requests a course and withdraws the request without reload (ADR-0016)', async ({
  page,
}) => {
  await enterAs(page, 'student')
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

test('student can re-request a course after withdrawing the prior request', async ({ page }) => {
  await enterAs(page, 'student')
  await page.getByRole('link', { name: 'Browse open courses' }).click()
  await expect(page.getByRole('heading', { name: 'Browse courses' })).toBeVisible()

  await page.getByRole('table').getByRole('button').first().click()

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
