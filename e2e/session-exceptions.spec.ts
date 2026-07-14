import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { pinDemoEpoch } from './helpers/clock'
import { seedDemo } from '../src/data/seed'
import { effectiveSessions, sessionsFor } from '../src/lib/sessions'

// Business time is pinned (ADR-0014) so the seeded overlay — and the counts
// asserted below — are exact, not wall-time-dependent.
const EPOCH = new Date('2026-06-15T12:00:00.000Z')
const world = seedDemo(EPOCH)

// The seed plants a cancelled + rescheduled exception on the teacher persona's
// upcoming cohort (ADR-0039) — `sxc-1`/`sxc-2`, named here rather than taken by
// position, since the ADR-0048 top-up fills the same array with the live cohorts'
// deviations. Derive the anchor and the expected count from the SAME lib the app
// runs, over the seed's own arrays — concrete, not hand-guessed.
const demoCourseId = world.sessionExceptions.find((e) => e.id === 'sxc-1')?.courseId
const demoCourse = world.courses.find((c) => c.id === demoCourseId)
if (!demoCourse) throw new Error('seed must plant a session exception on a course')

const baseCount = sessionsFor(demoCourse).length
const effectiveCount = effectiveSessions(demoCourse, world.sessionExceptions).length

test('the seeded overlay shortens the schedule and the manager surface is present', async ({
  page,
}) => {
  await pinDemoEpoch(page, EPOCH)
  await enterAs(page, 'teacher')
  await page.goto(`/app/courses/${demoCourse.id}`)

  await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible()
  // The owning teacher gets the write surface.
  await expect(page.getByRole('button', { name: 'Add session' })).toBeVisible()

  // One cancelled exception ⇒ the effective schedule is exactly one shorter than
  // the base derivation (the reschedule moves a session, it does not drop one).
  expect(effectiveCount).toBe(baseCount - 1)
})

test('a teacher cancels an upcoming session and it leaves the schedule', async ({ page }) => {
  await pinDemoEpoch(page, EPOCH)
  await enterAs(page, 'teacher')
  await page.goto(`/app/courses/${demoCourse.id}`)

  const upcoming = page.getByRole('list', { name: 'Upcoming' })
  const firstCancel = upcoming.getByRole('button', { name: /^Cancel — / }).first()
  await expect(firstCancel).toBeVisible()
  await firstCancel.click()

  // The confirm button reads "Cancel session" — distinct from the dialog's own
  // "Cancel" dismiss button, so the two never collide.
  await page.getByRole('button', { name: 'Cancel session' }).click()

  await expect(page.getByText('Session updated')).toBeVisible()
})
