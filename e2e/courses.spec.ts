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

  // Find and click on a browseable course (one the student is not enrolled in)
  const courseLink = page.getByRole('table').getByRole('link').first()
  const courseName = await courseLink.textContent()
  await courseLink.click()

  // Verify the course detail page loaded
  await expect(page.getByRole('heading', { name: courseName ?? '' })).toBeVisible()

  // Request enrollment
  const requestButton = page.getByRole('button', { name: 'Request a Spot' })
  await expect(requestButton).toBeVisible()
  await requestButton.click()

  // Verify the request section changed to show pending status (without page reload)
  await expect(requestButton).toBeHidden()
  const pendingSection = page.getByText('Your request is pending')
  await expect(pendingSection).toBeVisible()

  // Withdraw the request
  const withdrawButton = page.getByRole('button', { name: 'Withdraw Request' })
  await expect(withdrawButton).toBeVisible()
  await withdrawButton.click()

  // Verify the request section changed back (again, no reload)
  await expect(withdrawButton).toBeHidden()
  await expect(requestButton).toBeVisible()
})
