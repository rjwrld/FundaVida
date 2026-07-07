import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { pinDemoEpoch } from './helpers/clock'
import { seedDemo } from '../src/data/seed'
import { buildAgenda } from '../src/lib/agenda'

// Business time is pinned (ADR-0014) so the agenda derived below — and with it
// the anchors asserted against the rendered page — is exact, not wall-time
// dependent (mirrors close-readiness.spec.ts).
const EPOCH = new Date('2026-06-15T12:00:00.000Z')
const world = seedDemo(EPOCH)

/**
 * The dashboard aside's agenda slice replaced the decorative month-of-dots
 * `DashboardCalendar` (ADR-0038, issue #240): every role now gets a compact,
 * actionable agenda that ends with a link to the full `/app/calendar` week
 * view. This is the dashboard-wiring path unit tests can't fully exercise —
 * real routing, real aside collapse behavior across widths.
 */

test.describe('teacher dashboard agenda slice', () => {
  test('shows a needs-marking row deep-linked to Mark Attendance, and an Open Calendar link', async ({
    page,
  }) => {
    const teacherCourses = world.courses.filter((c) => c.teacherId === 'tea-1')
    const agenda = buildAgenda({
      role: 'teacher',
      courses: teacherCourses,
      attendance: world.attendance,
      grades: world.grades,
      enrollments: world.enrollments,
      certificates: world.certificates,
      now: EPOCH,
    })
    if (agenda.role !== 'teacher' || agenda.needsMarking.length === 0) {
      throw new Error('seed should give the teacher persona (tea-1) an unmarked session')
    }
    const [first] = agenda.needsMarking
    if (!first) throw new Error('seed should give the teacher persona (tea-1) an unmarked session')

    await pinDemoEpoch(page, EPOCH)
    await enterAs(page, 'teacher')

    const aside = page.getByRole('complementary')
    const row = aside.getByRole('link', { name: first.courseName }).first()
    await expect(row).toBeVisible()
    await expect(row).toHaveAttribute(
      'href',
      `/app/courses/${first.courseId}/sessions/${first.date}/mark`
    )

    const openCalendar = aside.getByRole('link', { name: /open calendar/i })
    await expect(openCalendar).toHaveAttribute('href', '/app/calendar')
    await openCalendar.click()
    await expect(page).toHaveURL(/\/app\/calendar$/)
  })
})

test.describe('student dashboard agenda slice', () => {
  test('shows a one-line progress row for an enrolled course', async ({ page }) => {
    const studentEnrollments = world.enrollments.filter((e) => e.studentId === 'stu-1')
    const enrolledCourseIds = new Set(studentEnrollments.map((e) => e.courseId))
    const studentCourses = world.courses.filter((c) => enrolledCourseIds.has(c.id))
    const agenda = buildAgenda({
      role: 'student',
      courses: studentCourses,
      attendance: world.attendance,
      grades: world.grades,
      enrollments: studentEnrollments,
      certificates: world.certificates.filter((c) => c.studentId === 'stu-1'),
      now: EPOCH,
    })
    if (agenda.role !== 'student' || agenda.progress.length === 0) {
      throw new Error('seed should enroll the student persona (stu-1) in a course')
    }
    const [row] = agenda.progress
    if (!row) throw new Error('seed should enroll the student persona (stu-1) in a course')

    await pinDemoEpoch(page, EPOCH)
    await enterAs(page, 'student')

    const aside = page.getByRole('complementary')
    await expect(aside.getByText(row.courseName).first()).toBeVisible()
    await expect(aside.getByRole('link', { name: /open calendar/i })).toHaveAttribute(
      'href',
      '/app/calendar'
    )
  })
})

test.describe('tcu dashboard agenda slice', () => {
  test('the aside now renders for tcu too, with an upcoming schedule and Open Calendar link', async ({
    page,
  }) => {
    // Before ADR-0038 the dashboard aside was xl-only and absent for tcu
    // entirely; this is the regression the issue calls out by name.
    await pinDemoEpoch(page, EPOCH)
    await enterAs(page, 'tcu')

    const aside = page.getByRole('complementary')
    await expect(aside).toBeVisible()
    await expect(aside.getByRole('link', { name: /open calendar/i })).toHaveAttribute(
      'href',
      '/app/calendar'
    )
  })
})

test.describe('admin dashboard agenda slice', () => {
  test('shows an operational pulse, not a per-session list, plus Open Calendar', async ({
    page,
  }) => {
    const agenda = buildAgenda({
      role: 'admin',
      courses: world.courses,
      attendance: world.attendance,
      grades: world.grades,
      enrollments: world.enrollments,
      certificates: world.certificates,
      now: EPOCH,
    })
    if (agenda.role !== 'admin') throw new Error('expected the admin agenda variant')

    await pinDemoEpoch(page, EPOCH)
    await enterAs(page, 'admin')

    const aside = page.getByRole('complementary')
    await expect(aside.getByText(String(agenda.pulse.unmarkedCount)).first()).toBeVisible()
    await expect(aside.getByText(String(agenda.pulse.coursesToCloseCount)).first()).toBeVisible()
    await expect(aside.getByRole('link', { name: /mark attendance/i })).toHaveCount(0)
    await expect(aside.getByRole('link', { name: /open calendar/i })).toHaveAttribute(
      'href',
      '/app/calendar'
    )
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

    const aside = page.getByRole('complementary')
    await expect(aside).toBeVisible()
    await expect(aside.getByRole('link', { name: /open calendar/i })).toBeVisible()
  })
})
