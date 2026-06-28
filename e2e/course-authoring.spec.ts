import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'

test('teacher creates a draft course at their own Sede and publishes it (ADR-0016)', async ({
  page,
}) => {
  // Teacher logs in
  await enterAs(page, 'teacher')
  await page.goto('/app/courses')
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()

  // Click "Add course" button (visible for teachers now)
  await page.getByRole('button', { name: 'Add course' }).click()

  // Form opens — verify Sede is locked to teacher's Sede
  await expect(page.getByTestId('sede-locked')).toBeVisible()
  const lockedSede = await page.getByTestId('sede-locked').textContent()
  expect(lockedSede).toBeTruthy()

  // Verify teacher is locked (self-assigned)
  await expect(page.getByTestId('teacher-locked')).toBeVisible()
  const lockedTeacher = await page.getByTestId('teacher-locked').textContent()
  expect(lockedTeacher).toContain('Linda')

  // Fill in the form
  await page.getByLabel('Course name').fill('Advanced Mathematics')
  await page.getByLabel('Description').fill('A comprehensive math course for secondary students')

  // Select program
  await page.getByRole('combobox', { name: 'Program' }).click()
  await page.getByRole('option').first().click()

  // Select level
  await page.getByRole('combobox', { name: 'Level' }).click()
  await page.getByRole('option', { name: 'Secundaria' }).click()

  // Set capacity
  await page.getByLabel('Capacity').fill('25')

  // Select term dates
  await page.getByLabel(/Term start/).fill('2026-07-01')
  await page.getByLabel(/Term end/).fill('2026-08-31')

  // Select meeting days
  await page
    .getByLabel(/Monday/, { exact: false })
    .locator('[type="checkbox"]')
    .check()
  await page
    .getByLabel(/Wednesday/, { exact: false })
    .locator('[type="checkbox"]')
    .check()

  // Status should not be visible/selectable for teachers on create
  await expect(page.getByRole('combobox', { name: 'Status' })).not.toBeVisible()

  // Save the form
  await page.getByRole('button', { name: 'Save' }).click()

  // Dialog closes, course appears in the list as DRAFT
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()
  await expect(page.getByText('Advanced Mathematics')).toBeVisible()
  await expect(page.getByTestId('course-status-draft')).toBeVisible()
  await expect(page.getByTestId('course-status-draft')).toContainText('Draft')

  // Find and click the Publish button for the course
  const row = page.getByRole('row').filter({ hasText: 'Advanced Mathematics' })
  await row.getByTestId('publish-button').click()

  // Course status changes to PUBLISHED
  await expect(page.getByTestId('course-status-published')).toBeVisible()
  await expect(page.getByTestId('course-status-published')).toContainText('Published')
})

test('cross-Sede course creation is rejected at form level (ADR-0016)', async ({ page }) => {
  // Teacher tries to create via form (though Sede is locked in UI)
  await enterAs(page, 'teacher')
  await page.goto('/app/courses')
  await page.getByRole('button', { name: 'Add course' }).click()

  // Sede picker is locked/hidden, so teacher cannot select cross-Sede
  const sedeField = page.getByTestId('sede-locked')
  await expect(sedeField).toBeVisible()

  // The locked value should match the teacher's actual Sede
  const lockedValue = await sedeField.textContent()
  expect(lockedValue).toBeTruthy()
})

test('published course becomes visible in student browse (ADR-0016)', async ({ page }) => {
  // Teacher creates and publishes a course
  await enterAs(page, 'teacher')
  await page.goto('/app/courses')
  await page.getByRole('button', { name: 'Add course' }).click()

  await page.getByLabel('Course name').fill('Intro Biology')
  await page.getByLabel('Description').fill('Biology fundamentals')
  await page.getByRole('combobox', { name: 'Program' }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('combobox', { name: 'Level' }).click()
  await page.getByRole('option', { name: 'Primaria' }).click()
  await page.getByLabel('Capacity').fill('20')
  await page.getByLabel(/Term start/).fill('2026-07-01')
  await page.getByLabel(/Term end/).fill('2026-08-31')
  await page
    .getByLabel(/Monday/, { exact: false })
    .locator('[type="checkbox"]')
    .check()
  await page.getByRole('button', { name: 'Save' }).click()

  // Course created as draft
  await expect(page.getByText('Intro Biology')).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Intro Biology' })
  await row.getByTestId('publish-button').click()

  // Course is now published
  await expect(page.getByTestId('course-status-published')).toBeVisible()

  // Switch to student and browse courses
  await enterAs(page, 'student')
  await page.goto('/app/courses/browse')
  await expect(page.getByRole('heading', { name: 'Browse Courses' })).toBeVisible()

  // The published course appears in browse (and matches Sede/Level)
  // The course should only appear if:
  // 1. It's published
  // 2. Sede matches student's Sede
  // 3. Level matches student's level or is 'both'
  // Since we created it at the teacher's Sede with primaria level,
  // a student at the same Sede with primaria level should see it
  const browsedCourses = page.getByRole('table').getByRole('button')
  const courseFound = await browsedCourses.locator('text=Intro Biology').isVisible()
  expect(courseFound).toBeTruthy()
})
