import { test, expect } from '@playwright/test'
import { seedDemo } from '../src/data/seed'
import { landingPathForRole } from '../src/lib/roleLanding'
import { fullName } from '../src/lib/personName'
import { setDemoEpoch } from '../src/lib/clock'

// The badges name the seeded personas (ADR-0049); both the app and this module
// seed at wall-time, so the derived names and the golden-path Course agree.
const world = seedDemo(new Date())
// landingPathForRole reads the permission matrix, whose ended-Course predicate
// runs on the Demo Epoch clock (ADR-0014) — hydrate it the way the store does,
// or this module's clock stays at 1970 and nothing has ended.
setDemoEpoch(world.demoEpoch, world.offset)
const teacher = world.teachers.find((t) => t.id === 'tea-1')
if (!teacher) throw new Error('seed should carry the tea-1 persona')
const student = world.students.find((s) => s.id === 'stu-1')
if (!student) throw new Error('seed should carry the stu-1 persona')

test.describe('smoke', () => {
  test('landing renders the hero headline and admin CTA', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Run a school from your browser.' })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter as admin' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'View on GitHub' })).toBeVisible()
  })

  test('picking a role lands on the dashboard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Enter as admin' }).first().click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { level: 1, name: /signed in as/i })).toBeVisible()
  })

  // Role entry lives on the persona badges (ADR-0049). Locators use the full
  // aria name (#157 scar tissue) so strict mode resolves exactly one button.
  test('the student badge signs in and lands on the app home', async ({ page }) => {
    await page.goto('/')
    await page
      .getByRole('button', {
        name: `Student ${fullName(student)} Your enrollments, progress, and certificates.`,
      })
      .click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { level: 1, name: /signed in as/i })).toBeVisible()
  })

  test('the teacher badge inherits the golden-path drop onto its gradeable Course', async ({
    page,
  }) => {
    const teacherPath = landingPathForRole('teacher', {
      courses: world.courses,
      enrollments: world.enrollments,
      grades: world.grades,
      currentUserId: 'tea-1',
    })
    if (!teacherPath.startsWith('/app/courses/')) {
      throw new Error('seed should leave tea-1 an ungraded ended Course')
    }

    await page.goto('/')
    await page
      .getByRole('button', {
        name: `Teacher ${fullName(teacher)} Your courses, attendance, and grading.`,
      })
      .click()
    await expect(page).toHaveURL(new RegExp(`${teacherPath}$`))
  })

  test('unknown route renders 404 with a back link', async ({ page }) => {
    await page.goto('/this-does-not-exist')
    await expect(page.getByRole('heading', { name: '404' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to home' })).toBeVisible()
  })

  test('deep-linking into /app with no role redirects to the landing', async ({ page }) => {
    await page.goto('/app/students')
    await expect(page).toHaveURL(/\/$/)
    await expect(
      page.getByRole('heading', { name: 'Run a school from your browser.' })
    ).toBeVisible()
  })
})
