import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { pinDemoEpoch } from './helpers/clock'
import { seedDemo } from '../src/data/seed'

// Business time is pinned (ADR-0014) so the persona's owned, live cohort is exact.
const EPOCH = new Date('2026-06-15T12:00:00.000Z')
const world = seedDemo(EPOCH)

// The teacher persona (tea-1) owns a published cohort — the "Message the class"
// runway (ADR-0041). Derived from the seed, not hand-guessed.
const teacherCourse = world.courses.find((c) => c.teacherId === 'tea-1' && c.status === 'published')
if (!teacherCourse) throw new Error('seed must give the teacher persona a published course')

// The oldest seeded campaign: an admin broadcast to every student, whose body
// ADR-0045 rewrote as a real Spanish email. Derived from the seed, not hand-copied.
const seededCampaign = world.emailCampaigns.find((c) => c.id === 'cam-1')
if (!seededCampaign) throw new Error('seed must contain the broadcast campaign cam-1')
const seededOpeningParagraph = seededCampaign.body.split('\n\n')[0] ?? ''

// The teacher persona's one class message (ADR-0046) and the Course it was sent to.
// That Course is *closed* — which is the whole reason the Sent messages card carries
// no lifecycle guard. Derived from the seed, not hand-guessed.
const classMessage = world.emailCampaigns.find((c) => c.id === 'cam-4')
if (!classMessage || classMessage.filter.kind !== 'course') {
  throw new Error('seed must contain the teacher-authored, course-scoped campaign cam-4')
}
const messagedCourseId = classMessage.filter.value
const classMessageOpeningParagraph = classMessage.body.split('\n\n')[0] ?? ''

test('admin sends a bulk email and sees it in the history', async ({ page }) => {
  const suffix = Date.now()
  const subject = `E2E ${suffix}`

  await page.goto('/')
  await page.getByRole('button', { name: 'Enter as admin' }).first().click()
  await page.getByRole('link', { name: 'Bulk Email' }).click()
  await expect(page.getByRole('heading', { name: 'Bulk email' })).toBeVisible()

  await page.getByLabel('Subject').fill(subject)
  await page
    .getByLabel('Body')
    .fill('This is an automated test body message for the bulk email demo flow.')

  // Default filter is "All students" — recipients count should be > 0.
  await expect(page.getByText(/\d+ recipient/)).toBeVisible()

  await page.getByRole('button', { name: 'Send' }).click()

  // Newly-sent campaign appears in the Sent campaigns table.
  await expect(page.getByRole('cell', { name: subject })).toBeVisible()
})

test('a teacher messages their own class from the Course, choosing an audience', async ({
  page,
}) => {
  const subject = `Class ${Date.now()}`
  await pinDemoEpoch(page, EPOCH)
  await enterAs(page, 'teacher')
  await page.goto(`/app/courses/${teacherCourse.id}`)

  // The owning Teacher gets the write surface (never the admin-only Bulk Email nav).
  await expect(page.getByRole('link', { name: 'Bulk Email' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Message the class' }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText(/no email leaves the browser/i)).toBeVisible()
  // Locked to the Course: no broad recipient filter, but an audience choice.
  await expect(dialog.getByText('Recipient filter')).toHaveCount(0)

  await dialog.getByLabel('Subject').fill(subject)
  await dialog.getByLabel('Body').fill('A note to the whole class about this week and materials.')

  // Pick the "both" audience (students + encargados).
  await dialog.getByLabel('Audience').click()
  await page.getByRole('option', { name: 'Students & encargados' }).click()
  await expect(dialog.getByText(/\d+ recipient/)).toBeVisible()

  await dialog.getByRole('button', { name: 'Send' }).click()

  // The simulated send closes the dialog and toasts success.
  await expect(page.getByText('Campaign sent successfully.')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('admin opens a sent campaign and reads it as a rendered email (ADR-0045)', async ({
  page,
}) => {
  await pinDemoEpoch(page, EPOCH)
  await enterAs(page, 'admin')
  await page.goto('/app/bulk-email')

  await page.getByRole('button', { name: seededCampaign.subject }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Email preview' })).toBeVisible()
  // App-side chrome the document itself does not carry (ADR-0041 recipient count).
  await expect(dialog.getByText('Sender:')).toBeVisible()
  await expect(dialog.getByText('All students')).toBeVisible()

  // The sandboxed document renders the subject as its heading and the seeded body's
  // first paragraph. The body is Spanish domain data; the disclaimer is chrome, so
  // it follows the app locale (ADR-0045) — an inbox, framed by the app.
  const email = page.frameLocator('iframe[title="Rendered email"]')
  await expect(email.getByRole('heading', { name: seededCampaign.subject })).toBeVisible()
  await expect(email.getByText(seededOpeningParagraph)).toBeVisible()
  await expect(email.getByText(/no email was actually sent/i)).toBeVisible()
})

test('a teacher previews their class message — the viewer rides the existing scope', async ({
  page,
}) => {
  await pinDemoEpoch(page, EPOCH)
  await enterAs(page, 'teacher')
  await page.goto(`/app/courses/${teacherCourse.id}`)

  // The viewer added no permission of its own (ADR-0045), so a teacher meets it
  // exactly where ADR-0041 already let them compose: in-Course, with the Course in
  // context. The broad /app/bulk-email surface stays admin-only (context-free
  // `courseOwned` denies the route), so the history table is not their entry point.
  await page.getByRole('button', { name: 'Message the class' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Subject').fill('Materiales de esta semana')
  await dialog.getByLabel('Body').fill('Estudiantes:\n\nTraigan su cuaderno.')

  await dialog.getByRole('button', { name: 'Preview' }).click()

  const email = page.frameLocator('iframe[title="Rendered email"]')
  await expect(email.getByRole('heading', { name: 'Materiales de esta semana' })).toBeVisible()
  await expect(email.getByText('Traigan su cuaderno.')).toBeVisible()
})

test('a teacher reads a class message they already sent, from the Course (ADR-0046)', async ({
  page,
}) => {
  await pinDemoEpoch(page, EPOCH)
  await enterAs(page, 'teacher')
  await page.goto(`/app/courses/${messagedCourseId}`)

  // The outbox mounts on the Course, never on the admin-only /app/bulk-email.
  await expect(page.getByRole('link', { name: 'Bulk Email' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Sent messages' })).toBeVisible()

  // No lifecycle guard: the cohort is closed, so there is no compose action here —
  // but the message the teacher sent while it ran is still readable.
  await expect(page.getByRole('button', { name: 'Message the class' })).toHaveCount(0)

  await page.getByRole('button', { name: classMessage.subject }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Email preview' })).toBeVisible()

  // Assert on the rendered artifact — subject and body — not the dialog's filter row.
  const email = page.frameLocator('iframe[title="Rendered email"]')
  await expect(email.getByRole('heading', { name: classMessage.subject })).toBeVisible()
  await expect(email.getByText(classMessageOpeningParagraph)).toBeVisible()
  await expect(email.getByText(/no email was actually sent/i)).toBeVisible()
})

test('the composer previews the current draft before sending', async ({ page }) => {
  await enterAs(page, 'admin')
  await page.goto('/app/bulk-email')

  // No document to render until both halves exist.
  const preview = page.getByRole('button', { name: 'Preview' })
  await expect(preview).toBeDisabled()

  await page.getByLabel('Subject').fill('Draft subject')
  await page.getByLabel('Body').fill('Primer párrafo.\n\nSegundo párrafo.')
  await expect(preview).toBeEnabled()
  await preview.click()

  const email = page.frameLocator('iframe[title="Rendered email"]')
  await expect(email.getByRole('heading', { name: 'Draft subject' })).toBeVisible()
  await expect(email.getByText('Segundo párrafo.')).toBeVisible()
  // A draft has no sender and no send timestamp — only routing chrome.
  await expect(page.getByRole('dialog').getByText('Sender:')).toHaveCount(0)
})

test('renders in Spanish when locale is ES', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('radio', { name: 'es' }).click()
  await page.getByRole('button', { name: 'Ingresar como administrador' }).first().click()
  await page.getByRole('link', { name: 'Correos masivos' }).click()
  await expect(page.getByRole('heading', { name: 'Correos masivos' })).toBeVisible()
})
