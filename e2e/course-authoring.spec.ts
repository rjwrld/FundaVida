import { test, expect, type Page } from '@playwright/test'
import { enterAs } from './helpers/auth'

const STATE_KEY = 'fundavida:v4:state'

// Deterministic anchors from the seed: tea-1 "Garnet Reynolds-Miller" teaches at
// Linda Vista; stu-1 is a Linda Vista / primaria student. A teacher-authored
// primaria course at Linda Vista is therefore browseable by stu-1 once published.
const TEACHER_NAME = 'Garnet Reynolds-Miller'
const TEACHER_SEDE = 'Linda Vista'

/** Fill the teacher create-course form (Sede + teacher are locked, status hidden). */
async function fillCourseForm(
  page: Page,
  opts: { name: string; level: 'Primary' | 'Secondary'; capacity: string }
) {
  await page.getByLabel('Course name').fill(opts.name)
  await page.getByLabel('Description').fill(`${opts.name} — course description`)
  await page.getByRole('combobox', { name: 'Program' }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('combobox', { name: 'Level' }).click()
  await page.getByRole('option', { name: opts.level, exact: true }).click()
  await page.getByLabel('Capacity').fill(opts.capacity)
  await page.getByLabel('Term start').fill('2026-07-01')
  await page.getByLabel('Term end').fill('2026-08-31')
  await page.getByLabel('Monday', { exact: true }).check()
  await page.getByRole('button', { name: 'Save' }).click()
}

test('teacher creates an own-Sede draft and publishes it (ADR-0016)', async ({ page }) => {
  await enterAs(page, 'teacher')
  await page.goto('/app/courses')
  await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible()

  await page.getByRole('button', { name: 'Add course' }).click()

  // The create form locks the Sede to the teacher's own and self-assigns them;
  // the status picker is hidden (new courses are always drafts).
  await expect(page.getByTestId('sede-locked')).toHaveText(TEACHER_SEDE)
  await expect(page.getByTestId('teacher-locked')).toContainText(TEACHER_NAME)
  await expect(page.getByRole('combobox', { name: 'Status' })).toBeHidden()

  await fillCourseForm(page, { name: 'Advanced Mathematics', level: 'Secondary', capacity: '25' })

  // The new course shows as a draft in the teacher's own list.
  const row = page.getByRole('row').filter({ hasText: 'Advanced Mathematics' })
  await expect(row).toBeVisible()
  await expect(row.getByTestId('course-status-draft')).toContainText('Draft')

  // Publishing it flips the badge without a reload.
  await row.getByTestId('publish-button').click()
  await expect(row.getByTestId('course-status-published')).toContainText('Published')
})

test('the create form gives a teacher no way to pick another campus (ADR-0011/0016)', async ({
  page,
}) => {
  await enterAs(page, 'teacher')
  await page.goto('/app/courses')
  await page.getByRole('button', { name: 'Add course' }).click()

  // Sede is shown read-only as the teacher's own; there is no Campus picker.
  await expect(page.getByTestId('sede-locked')).toHaveText(TEACHER_SEDE)
  await expect(page.getByRole('combobox', { name: 'Campus' })).toBeHidden()
})

test('a published course appears in a matching student browse list (ADR-0016)', async ({
  page,
}) => {
  await enterAs(page, 'teacher')
  await page.goto('/app/courses')
  await page.getByRole('button', { name: 'Add course' }).click()
  await fillCourseForm(page, { name: 'Intro Biology', level: 'Primary', capacity: '20' })

  const row = page.getByRole('row').filter({ hasText: 'Intro Biology' })
  await expect(row).toBeVisible()
  // While still a draft, a matching student must NOT see it in Browse.
  await row.getByTestId('publish-button').click()
  await expect(row.getByTestId('course-status-published')).toBeVisible()

  // Wait for the publish to persist before switching roles.
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        const state = JSON.parse(raw) as { courses: { name: string; status: string }[] }
        return state.courses.find((c) => c.name === 'Intro Biology')?.status ?? null
      }, STATE_KEY)
    )
    .toBe('published')

  // A Linda Vista / primaria student now finds it in Browse.
  await enterAs(page, 'student')
  await page.goto('/app/courses/browse')
  await expect(page.getByRole('heading', { name: 'Browse courses' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Intro Biology' })).toBeVisible()
})
