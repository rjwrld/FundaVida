import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { pinDemoEpoch } from './helpers/clock'
import { seedDemo } from '../src/data/seed'
import { closeReadiness } from '../src/lib/closeReadiness'
import { coursesToClose } from '../src/lib/dashboard'
import { shortCourseName } from '../src/lib/courseName'

// Business time is pinned (ADR-0014) so the derived session list — and with it
// the readiness counts asserted below — is exact, not wall-time-dependent.
const EPOCH = new Date('2026-06-15T12:00:00.000Z')
const world = seedDemo(EPOCH)

// The dashboard worklist's anchor: a published, Term-ended course whose expected
// readiness comes from the SAME closeReadiness() the app runs, over the seed's
// own arrays — concrete counts, not hand-guessed numbers. Require both gap kinds
// non-zero so the checklist renders both fail rows (a zero count renders the
// pass label instead). The seed records attendance for only the last 10 sessions
// per enrollment, so every closeable course derives blocked; this spec drives
// the blocked path (the ready path is unit-tested).
const derived = coursesToClose(world.courses, EPOCH).map((course) => ({
  course,
  readiness: closeReadiness({
    course,
    enrollments: world.enrollments,
    grades: world.grades,
    attendance: world.attendance,
    now: EPOCH,
  }),
}))
const anchor = derived.find(
  ({ readiness }) =>
    readiness.ungradedStudentIds.length > 0 && readiness.unrecordedSessions.length > 0
)
if (!anchor) throw new Error('seed has no closeable course blocked on both grades and attendance')
const { course: anchorCourse, readiness } = anchor

const ungraded = readiness.ungradedStudentIds.length
const unrecorded = readiness.unrecordedSessions.length
const gradesGap = `${ungraded} ${ungraded === 1 ? 'student' : 'students'} ungraded`
const attendanceGap = `${unrecorded} ${unrecorded === 1 ? 'session' : 'sessions'} unrecorded`

test('dashboard readiness indicator agrees with the course detail checklist (issue 204)', async ({
  page,
}) => {
  await pinDemoEpoch(page, EPOCH)
  await enterAs(page, 'admin')

  // Dashboard: the Courses-to-close card row for the anchor course carries the
  // blocked indicator.
  const card = page
    .locator('article')
    .filter({ has: page.getByRole('heading', { name: 'Courses to close' }) })
  const row = card.getByRole('link', { name: anchorCourse.name })
  await expect(row.getByTestId('close-readiness-indicator')).toHaveText('Blocked')

  // The indicator does not break the row link: it navigates to the detail page.
  await row.click()
  await expect(page.getByRole('heading', { name: shortCourseName(anchorCourse) })).toBeVisible()

  // Detail: the checklist shows the same verdict and the concrete gaps the
  // seed's arrays derive.
  await expect(page.getByTestId('close-readiness-verdict')).toHaveText('Blocked')
  await expect(page.getByText(gradesGap)).toBeVisible()
  await expect(page.getByText(attendanceGap)).toBeVisible()
})
