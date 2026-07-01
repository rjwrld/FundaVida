import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'

// Deterministic anchors from the seed (faker.seed(42), epoch-independent — the app
// reseeds at real wall-time but the structural graph matches, ADR-0002). The first
// emitted Certificate anchors a Student with a closed Course and a passing Grade,
// so their profile has an Issued certificate state and a populated certs section.
const world = seedDemo(new Date())
const anchorCert = world.certificates[0]
if (!anchorCert) throw new Error('seed has no emitted certificate')
const certStudent = world.students.find((s) => s.id === anchorCert.studentId)
if (!certStudent) throw new Error('seed: certificate student missing')
const certStudentName = `${certStudent.firstName} ${certStudent.lastName}`
// A Student other than the logged-in student persona (stu-1), to prove a Student
// cannot reach another Student's profile.
const otherStudent = world.students.find((s) => s.id !== 'stu-1')
if (!otherStudent) throw new Error('seed has no non-persona student')

test('admin creates a student and sees them in the list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Students', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible()

  await page.getByRole('button', { name: 'Add student' }).click()
  await expect(page.getByRole('heading', { name: 'New student' })).toBeVisible()

  await page.getByLabel('First name').fill('Ada')
  await page.getByLabel('Last name').fill('Lovelace')
  await page.getByLabel('Email', { exact: true }).fill('ada+e2e@example.com')

  // Province first, then canton (its options are scoped to the province).
  await page.getByRole('combobox', { name: /province/i }).click()
  await page.getByRole('option', { name: 'San José' }).click()
  await page.getByRole('combobox', { name: /canton/i }).click()
  await page.getByRole('option', { name: 'Escazú' }).click()

  await page.getByRole('combobox', { name: /campus/i }).click()
  await page.getByRole('option', { name: 'Linda Vista' }).click()

  // Encargado (guardian) — required.
  await page.getByLabel(/guardian name/i).fill('María Lovelace')
  await page.getByRole('combobox', { name: /relationship/i }).click()
  await page.getByRole('option', { name: 'Mother' }).click()
  await page.getByLabel(/guardian phone/i).fill('8888-8888')
  await page.getByLabel(/guardian email/i).fill('maria.lovelace@gmail.com')

  await page.getByRole('button', { name: 'Save' }).click()

  // The modal closes and the new student shows up in the list.
  await expect(page.getByRole('heading', { name: 'New student' })).toBeHidden()
  await page.getByPlaceholder('Search by name or email').fill('Ada')
  await expect(page.getByRole('link', { name: 'Ada Lovelace' })).toBeVisible()
  await expect(page.getByText('ada+e2e@example.com')).toBeVisible()
})

test('admin sees a real profile: enrollments with progress and a certificates section', async ({
  page,
}) => {
  await enterAs(page, 'admin')
  await page.goto(`/app/students/${certStudent.id}`)

  // The header names the student, and the enrollments table carries per-course
  // progress columns (ADR-0012: all read through the scope seam).
  await expect(page.getByRole('heading', { name: certStudentName })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Attendance' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Grade' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Certificate' })).toBeVisible()

  // The closed course's enrollment shows the Issued certificate state…
  await expect(page.getByText('Issued').first()).toBeVisible()
  // …and the certificates section lists the emitted certificate (downloadable).
  await expect(page.getByRole('heading', { name: 'Certificates' })).toBeVisible()
})

test('a student cannot open another student’s profile (self-only, ADR-0012)', async ({ page }) => {
  await enterAs(page, 'student')
  await page.goto(`/app/students/${otherStudent.id}`)

  // The students resource is not visible to a Student: the route guard redirects to
  // the dashboard, so no other student's record is ever rendered.
  await expect(page).toHaveURL(/\/app$/)
  await expect(
    page.getByRole('heading', {
      name: `${otherStudent.firstName} ${otherStudent.lastName}`,
    })
  ).toHaveCount(0)
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Estudiantes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Estudiantes' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar estudiante' })).toBeVisible()
})
