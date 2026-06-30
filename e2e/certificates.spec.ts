import { test, expect, type Page } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'

// Deterministic anchors from the seed (faker.seed(42), epoch-independent). The app
// reseeds fresh at real wall-time, so the structural graph here matches what the
// browser hydrates — only the floating dates differ (ADR-0002).
const world = seedDemo(new Date())
const PASSING_SCORE = 70
const passingPair = new Set(
  world.grades.filter((g) => g.score >= PASSING_SCORE).map((g) => `${g.studentId}:${g.courseId}`)
)
// A published Course owned by the teacher persona (tea-1) with at least one approved
// Student who passed — so closing it emits at least one Certificate (ADR-0024).
const closableCourse = world.courses.find(
  (c) =>
    c.status === 'published' &&
    c.teacherId === 'tea-1' &&
    world.enrollments.some(
      (e) =>
        e.courseId === c.id && e.status === 'approved' && passingPair.has(`${e.studentId}:${c.id}`)
    )
)
if (!closableCourse) throw new Error('seed has no closable tea-1 course with a passing student')

async function openCertificatePreview(page: Page) {
  await enterAs(page, 'admin')
  await page.getByRole('link', { name: 'Certificates' }).click()
  // The gallery lists every emitted Certificate as a previewable card — there is no
  // approval step or Approved tab (ADR-0024); each card is downloadable.
  await page
    .getByRole('button', { name: /open preview/i })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'Certificate preview' })).toBeVisible()
}

test('shows the whole certificate, footer included, on a short window', async ({ page }) => {
  // A short viewport used to clip the certificate's lower half with no way to scroll.
  await page.setViewportSize({ width: 1000, height: 560 })
  await openCertificatePreview(page)

  // The ISSUED / PROGRAM footer is the last block; if it is fully in the viewport,
  // the certificate scaled to fit the short window instead of being clipped.
  await expect(page.getByRole('dialog').getByText('PROGRAM', { exact: true })).toBeInViewport({
    ratio: 1,
  })
})

test('lets you scroll to the footer when the window is too short to scale it', async ({ page }) => {
  // Below the readable floor the certificate stops shrinking, so the preview must
  // scroll rather than clip the footer away.
  await page.setViewportSize({ width: 1000, height: 340 })
  await openCertificatePreview(page)

  const footer = page.getByRole('dialog').getByText('PROGRAM', { exact: true })
  await expect(footer).not.toBeInViewport() // starts out below the fold…
  await footer.scrollIntoViewIfNeeded()
  await expect(footer).toBeInViewport() // …and is reachable by scrolling
})

test('admin previews and downloads a certificate, with no approval anywhere', async ({ page }) => {
  await enterAs(page, 'admin')
  await page.getByRole('link', { name: 'Certificates' }).click()
  await expect(page.getByRole('heading', { name: 'Certificates', exact: true })).toBeVisible()

  // Approval is gone: no Approve / Approve all controls, no worklist tabs.
  await expect(page.getByRole('button', { name: /^approve/i })).toHaveCount(0)
  await expect(page.getByRole('tab')).toHaveCount(0)

  await page
    .getByRole('button', { name: /open preview/i })
    .first()
    .click()
  await expect(page.getByRole('heading', { name: 'Certificate preview' })).toBeVisible()

  // Wait for the async PDF blob to resolve before clicking.
  const downloadBtn = page.getByRole('button', { name: 'Download PDF' })
  await expect(downloadBtn).not.toHaveAttribute('aria-disabled', 'true')

  const downloadPromise = page.waitForEvent('download', (d) =>
    /^certificate-.*\.pdf$/.test(d.suggestedFilename())
  )
  await downloadBtn.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^certificate-.*\.pdf$/)
})

test('closing a course emits its certificates, downloadable in context', async ({ page }) => {
  await enterAs(page, 'teacher') // currentUserId === 'tea-1'
  await page.goto(`/app/courses/${closableCourse.id}`)

  // Before closing, the in-course Certificates section is empty and the Close action is offered.
  await expect(page.getByText('Certificates appear here once this course is closed.')).toBeVisible()
  await page.getByRole('button', { name: 'Close course' }).click()

  // Confirm in the dialog (its confirm button shares the label).
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Close course' }).click()

  // The freshly-emitted Certificate now appears in the in-course section and the
  // Close action is gone — proving the close ran and emitted (ADR-0024).
  const certCard = page.getByRole('button', { name: /open preview/i }).first()
  await expect(certCard).toBeVisible()
  await expect(page.getByRole('button', { name: 'Close course' })).toHaveCount(0)

  // …and it is immediately downloadable, no approval step.
  await certCard.click()
  await expect(page.getByRole('heading', { name: 'Certificate preview' })).toBeVisible()
  const downloadBtn = page.getByRole('button', { name: 'Download PDF' })
  await expect(downloadBtn).not.toHaveAttribute('aria-disabled', 'true')
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Certificados' }).click()
  await expect(page.getByRole('heading', { name: 'Certificados', exact: true })).toBeVisible()
})
