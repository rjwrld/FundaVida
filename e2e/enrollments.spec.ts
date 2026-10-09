import { test, expect } from '@playwright/test'
import { seedDemo } from '../src/data/seed'
import { fullName } from '../src/lib/personName'

// An approved enrollment in a live cohort: only those offer Unenroll (a closed
// cohort is terminal, ADR-0024). Derived from the seed, then found by search.
const world = seedDemo(new Date())
const liveApproved = world.enrollments.find(
  (e) =>
    e.status === 'approved' &&
    world.courses.find((c) => c.id === e.courseId)?.status === 'published'
)
if (!liveApproved) throw new Error('seed: no approved enrollment in a live course')
const liveStudent = world.students.find((s) => s.id === liveApproved.studentId)
if (!liveStudent) throw new Error('seed: enrollment student missing')
const LIVE_NAME = fullName(liveStudent)

test('admin unenrolls a student from the enrollments list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Enrollments', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Enrollments' })).toBeVisible()

  // The page opens on the pending requests (ADR-0051); approved rows carry
  // Unenroll, whose accessible name is "Delete {name}" via aria-label.
  await page.getByRole('combobox', { name: 'Filter by status' }).click()
  await page.getByRole('option', { name: 'Approved' }).click()

  await page.getByPlaceholder('Search students').fill(LIVE_NAME)

  const unenroll = page.getByRole('button', { name: `Delete ${LIVE_NAME}`, exact: true })
  await expect(unenroll.first()).toBeVisible()
  const initialCount = await unenroll.count()
  await unenroll.first().click()
  // Styled confirmation modal — confirm with the "Unenroll" action.
  await page.getByRole('button', { name: 'Unenroll' }).click()

  await expect.poll(async () => unenroll.count()).toBeLessThan(initialCount)
})

test('list renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'Español' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Matrículas', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Matrículas' })).toBeVisible()
  // Opens on the pending requests, each decided in place.
  await expect(page.getByRole('button', { name: /^Aprobar / }).first()).toBeVisible()
})
