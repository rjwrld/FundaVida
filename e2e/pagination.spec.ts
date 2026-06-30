import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'

// The structural graph is deterministic (faker.seed(42)), so the scoped row count
// an admin sees is stable even though the app reseeds at wall-time (ADR-0002).
const world = seedDemo(new Date())
const studentCount = world.students.length
const PAGE_SIZE = 10
const pageCount = Math.ceil(studentCount / PAGE_SIZE)

test.beforeAll(() => {
  // Guard: the assertion is only meaningful if the seed exceeds one page.
  if (studentCount <= PAGE_SIZE) throw new Error('seed students do not exceed one page')
})

test('the students list caps rendered rows at the page size and pages through the scoped set', async ({
  page,
}) => {
  await enterAs(page, 'admin')
  await page.goto('/app/students')
  await expect(page.getByRole('heading', { name: 'Students' })).toBeVisible()

  // The whole scoped list is 84 students, but only one page is ever in the DOM.
  // This is the regression the unit tests can't see: a page that forgot to window
  // would render every row here (the #87-class bug the milestone guards against).
  const rows = page.locator('table tbody tr')
  await expect(rows).toHaveCount(PAGE_SIZE)

  // The pager reports the full scoped total spread across multiple pages.
  await expect(page.getByText(`Page 1 of ${pageCount}`)).toBeVisible()
  await expect(
    page.getByText(new RegExp(`Showing 1.${PAGE_SIZE} of ${studentCount}`))
  ).toBeVisible()

  // Advancing the pager re-windows the rows: still capped, but a different page.
  const firstRowBefore = await rows.first().textContent()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText(`Page 2 of ${pageCount}`)).toBeVisible()
  await expect(rows).toHaveCount(PAGE_SIZE)
  expect(await rows.first().textContent()).not.toBe(firstRowBefore)

  // The last page holds only the remainder, never more than a page.
  await page.getByRole('button', { name: 'Last page' }).click()
  await expect(page.getByText(`Page ${pageCount} of ${pageCount}`)).toBeVisible()
  const remainder = studentCount - (pageCount - 1) * PAGE_SIZE
  await expect(rows).toHaveCount(remainder)
})
