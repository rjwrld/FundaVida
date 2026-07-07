import { test, expect, type Page } from '@playwright/test'
import { addDays, format, subDays } from 'date-fns'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'

const STATE_KEY = 'fundavida:v10:state'

// Deterministic anchors from the seed (faker.seed(42), epoch-independent):
// tea-1 is the teacher persona at Linda Vista; stu-1 is a Linda Vista / primaria
// student. A teacher-authored primaria course at Linda Vista is therefore
// browseable by stu-1 once published. Names are derived so the spec follows the
// seed rather than hardcoding a person.
const teacherPersona = seedDemo(new Date()).teachers[0]
if (!teacherPersona) throw new Error('seed must include a teacher persona (tea-1)')
const TEACHER_NAME = `${teacherPersona.firstName} ${teacherPersona.lastName}`
const TEACHER_SEDE = teacherPersona.sede

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
  // Term dates are relative to the (unpinned) wall-clock the app boots against, so
  // a created course lands "In progress" deterministically — the derived display
  // state (ADR-0042) would otherwise flip with the calendar. Yesterday → +90d
  // straddles now with margin on both sides.
  const today = new Date()
  await page.getByLabel('Term start').fill(format(subDays(today, 1), 'yyyy-MM-dd'))
  await page.getByLabel('Term end').fill(format(addDays(today, 90), 'yyyy-MM-dd'))
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

  // Publishing it flips the badge without a reload — a published, mid-Term course
  // reads "In progress" via the derived display state (ADR-0042).
  await row.getByTestId('publish-button').click()
  await expect(row.getByTestId('course-status-published')).toContainText('In progress')
})

test('teacher closes a published course from its detail page (ADR-0024)', async ({ page }) => {
  await enterAs(page, 'teacher')
  await page.goto('/app/courses')
  await page.getByRole('button', { name: 'Add course' }).click()
  await fillCourseForm(page, { name: 'Closeable Course', level: 'Primary', capacity: '15' })

  // Publish it first — closing is a published-only ceremony (ADR-0024).
  const row = page.getByRole('row').filter({ hasText: 'Closeable Course' })
  await expect(row).toBeVisible()
  await row.getByTestId('publish-button').click()
  await expect(row.getByTestId('course-status-published')).toBeVisible()

  // Open its detail page and close the cohort.
  await row.getByRole('link', { name: 'Closeable Course' }).click()
  await expect(page.getByRole('heading', { name: 'Closeable Course' })).toBeVisible()
  await page.getByRole('button', { name: 'Close course' }).click()

  // Confirm in the dialog (its confirm button shares the trigger's label).
  await page.getByRole('dialog').getByRole('button', { name: 'Close course' }).click()

  // The close persists to the store as a 'closed' status…
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const raw = window.localStorage.getItem(key)
        if (!raw) return null
        const state = JSON.parse(raw) as { courses: { name: string; status: string }[] }
        return state.courses.find((c) => c.name === 'Closeable Course')?.status ?? null
      }, STATE_KEY)
    )
    .toBe('closed')

  // …the overview reflects it via the display-state badge (a closed cohort reads
  // "Finished", ADR-0042), and the close action is gone (closed is terminal).
  await expect(page.getByTestId('course-status-badge')).toHaveText('Finished')
  await expect(page.getByRole('button', { name: 'Close course' })).toBeHidden()
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
