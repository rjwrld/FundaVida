import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { pinDemoEpoch } from './helpers/clock'
import { seedDemo } from '../src/data/seed'
import { upcomingSessions } from '../src/lib/sessions'
import { calendarCardName } from '../src/lib/courseName'
import type { Course } from '../src/types'

// Business time is pinned (ADR-0014) so the agenda derived below — and with it
// the anchors asserted against the rendered page — is exact, not wall-time
// dependent (mirrors close-readiness.spec.ts).
const EPOCH = new Date('2026-06-15T12:00:00.000Z')
const world = seedDemo(EPOCH)

/**
 * The dashboard aside's agenda slice replaced the decorative month-of-dots
 * `DashboardCalendar` (ADR-0038, issue #240). ADR-0050 narrowed it: only the
 * teacher and student keep an aside, and it is Upcoming only, ending with a
 * link to the full `/app/calendar` week view. This is the dashboard-wiring path
 * unit tests can't fully exercise — real routing, real aside collapse behavior
 * across widths.
 */

/**
 * The next upcoming Session over a persona's Courses, as the aside derives it —
 * the seed's exceptions overlay included (ADR-0048), or the anchor names a
 * Session the effective schedule cancelled or moved.
 */
function nextUpcoming(courses: Course[]) {
  const [next] = upcomingSessions(courses, EPOCH, 1, world.sessionExceptions)
  if (!next) throw new Error('seed should give the persona an upcoming Session')
  const course = courses.find((c) => c.id === next.courseId)
  if (!course) throw new Error('upcoming Session should belong to a seeded course')
  return { next, course }
}

for (const { role, courses } of [
  { role: 'teacher' as const, courses: world.courses.filter((c) => c.teacherId === 'tea-1') },
  {
    role: 'student' as const,
    courses: world.courses.filter((c) =>
      world.enrollments.some(
        (e) => e.studentId === 'stu-1' && e.courseId === c.id && e.status === 'approved'
      )
    ),
  },
]) {
  test.describe(`${role} dashboard agenda slice`, () => {
    test('is Upcoming only: the next Session links to its Course, then Open Calendar', async ({
      page,
    }) => {
      const { next, course } = nextUpcoming(courses)

      await pinDemoEpoch(page, EPOCH)
      await enterAs(page, role)

      const aside = page.getByRole('complementary', { name: 'Agenda' })
      const upcoming = aside.getByRole('region', { name: 'Upcoming' })
      const row = upcoming.getByRole('link', { name: calendarCardName(course) }).first()
      await expect(row).toBeVisible()
      await expect(row).toHaveAttribute('href', `/app/courses/${next.courseId}`)
      // The needs-marking hero and the student's progress list left the aside (ADR-0050).
      await expect(aside.getByText(/to mark|my progress/i)).toHaveCount(0)

      const openCalendar = aside.getByRole('link', { name: /open calendar/i })
      await expect(openCalendar).toHaveAttribute('href', '/app/calendar')
      await openCalendar.click()
      await expect(page).toHaveURL(/\/app\/calendar$/)
    })
  })
}

test.describe('tcu dashboard agenda slice', () => {
  test('the aside now renders for tcu too, with an upcoming schedule and Open Calendar link', async ({
    page,
  }) => {
    // Before ADR-0038 the dashboard aside was xl-only and absent for tcu
    // entirely; this is the regression the issue calls out by name.
    await pinDemoEpoch(page, EPOCH)
    await enterAs(page, 'tcu')

    const aside = page.getByRole('complementary', { name: 'Agenda' })
    await expect(aside).toBeVisible()
    await expect(aside.getByRole('link', { name: /open calendar/i })).toHaveAttribute(
      'href',
      '/app/calendar'
    )
  })
})

test.describe('admin dashboard', () => {
  test('has no agenda aside — the worklists take the full width (ADR-0050)', async ({ page }) => {
    await pinDemoEpoch(page, EPOCH)
    await enterAs(page, 'admin')

    await expect(page.getByRole('heading', { name: 'Students at risk' })).toBeVisible()
    await expect(page.getByRole('complementary', { name: 'Agenda' })).toHaveCount(0)
  })
})

test.describe('aside visibility below xl', () => {
  test('the agenda slice renders at a narrower, sub-xl viewport (no xl-only gate)', async ({
    page,
  }) => {
    // Pre-#240 the aside was hidden below the xl breakpoint entirely; a compact
    // agenda should travel down gracefully instead.
    await page.setViewportSize({ width: 1024, height: 900 })
    await pinDemoEpoch(page, EPOCH)
    await enterAs(page, 'teacher')

    const aside = page.getByRole('complementary', { name: 'Agenda' })
    await expect(aside).toBeVisible()
    await expect(aside.getByRole('link', { name: /open calendar/i })).toBeVisible()
  })
})
