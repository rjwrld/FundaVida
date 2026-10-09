import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'
import { attendanceRollup } from '../src/lib/attendanceRollup'
import { courseDisplayState } from '../src/lib/courseDisplayState'

// A rollup row whose Course page grows a close-readiness checklist above its
// Sessions once its reads resolve: a published, Term-ended cohort (ADR-0024).
// Derived from the seed through the page's own lib, so the row's page is known.
const NOW = new Date()
const world = seedDemo(NOW)
const ROWS = attendanceRollup({
  courses: world.courses,
  attendance: world.attendance,
  sessionExceptions: world.sessionExceptions,
  now: NOW,
})
const ENDED_INDEX = ROWS.findIndex(
  (r) => r.course.status === 'published' && courseDisplayState(r.course, NOW) === 'termEnded'
)
const ENDED = ROWS[ENDED_INDEX]?.course
if (!ENDED) throw new Error('seed: no Term-ended published course in the rollup')

test('admin reads attendance as one row per course and opens its sessions', async ({ page }) => {
  await enterAs(page, 'admin')
  await page.getByRole('link', { name: 'Attendance' }).click()
  await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible()

  // One rollup row per course (ADR-0051), not the per-record ledger.
  await expect(page.getByRole('columnheader', { name: 'Sessions held' })).toBeVisible()
  const firstRow = page.getByRole('row').nth(1)
  await expect(firstRow).toBeVisible()

  // The course link lands on that course's Sessions section, where marking lives.
  await firstRow.getByRole('link').click()
  await expect(page).toHaveURL(/\/app\/courses\/cou-\d+#sessions$/)
  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeInViewport()
})

test('a rollup row lands on its Sessions even when a checklist mounts above them', async ({
  page,
}) => {
  await enterAs(page, 'admin')
  await page.getByRole('link', { name: 'Attendance' }).click()
  await expect(page.getByRole('columnheader', { name: 'Sessions held' })).toBeVisible()
  // The table pages ten rows at a time.
  for (let p = 0; p < Math.floor(ENDED_INDEX / 10); p++) {
    await page.getByRole('button', { name: /next page/i }).click()
  }
  await page.getByRole('row').getByRole('link', { name: ENDED.name }).click()

  await expect(page).toHaveURL(new RegExp(`/app/courses/${ENDED.id}#sessions$`))
  // The checklist rendered above, and Sessions is still where the link pointed.
  await expect(page.getByTestId('close-readiness-verdict')).toBeAttached()
  const sessions = page.getByRole('heading', { name: 'Sessions', exact: true })
  await expect(sessions).toBeInViewport()
  // …and at the top of it, where the scroll put it — not pushed down by content
  // that mounted after the scroll ran (the section keeps a scroll-mt-20 margin).
  await expect.poll(async () => (await sessions.boundingBox())?.y ?? Infinity).toBeLessThan(160)
})

test('teacher has no Attendance page — marking lives on the course', async ({ page }) => {
  await enterAs(page, 'teacher')
  await expect(page.getByRole('link', { name: 'Attendance', exact: true })).toHaveCount(0)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'Español' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Asistencia' }).click()
  await expect(page.getByRole('heading', { name: 'Asistencia' })).toBeVisible()
})
