import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

test('teacher grades a student in their course', async ({ page }) => {
  await enterAs(page, 'teacher')
  await page.getByRole('link', { name: 'Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()

  // Open the first course in the list (link inside the table body)
  await page.getByRole('table').getByRole('link').first().click()

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
  await page.getByRole('link', { name: 'Browse Courses' }).click()
  await expect(page.getByRole('heading', { name: 'Browse Courses' })).toBeVisible()

  // Open a browseable course. Each row's name is a button (not a link) that
  // navigates to the read-only detail.
  const courseNameButton = page.getByRole('table').getByRole('button').first()
  const courseName = ((await courseNameButton.textContent()) ?? '').trim()
  await courseNameButton.click()

  // Verify the course detail page loaded (heading is the course name)
  await expect(page.getByRole('heading', { name: courseName })).toBeVisible()

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
