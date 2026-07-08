import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'

// Storage keys must match src/data/persistence.ts (the ES path sets them directly
// because the new landing only exposes "Enter as admin").
const ROLE_KEY = 'fundavida:v2:role'
const USER_KEY = 'fundavida:v2:current-user'
const LOCALE_KEY = 'fundavida:v2:locale'

// The Student persona the app logs in as (stu-1). Anchors derived from the seed
// (faker.seed(42), epoch-independent structural graph — ADR-0002) so the spec
// follows the demo data rather than hardcoding names.
const world = seedDemo(new Date())
const me = world.students.find((s) => s.id === 'stu-1')
if (!me) throw new Error('seed: stu-1 missing')
const meName = `${me.firstName} ${me.lastName}`
// A passing Grade (>=70) stu-1 holds proves the per-course progress treatment.
const passingGrade = world.grades.find((g) => g.studentId === 'stu-1' && g.score >= 70)
if (!passingGrade) throw new Error('seed: stu-1 has no passing grade')

test('a student reaches their self-service profile from the nav (#166, ADR-0043)', async ({
  page,
}) => {
  await enterAs(page, 'student')

  // The dashboard's My-profile shortcut card is gone (ADR-0043); the Account nav
  // section now carries the entry point (ADR-0010). It's the only "My profile"
  // link on the page, so an unscoped locator is unambiguous.
  await page.getByRole('link', { name: /my profile/i }).click()
  await expect(page).toHaveURL(/\/app\/me$/)

  // …landing on the read-only hub: identity + guardian, read through self-scoped
  // seams (issue #166, ADR-0012).
  await expect(page.getByRole('heading', { name: meName })).toBeVisible()
  await expect(page.getByText(me.guardian.name)).toBeVisible()
  await expect(page.getByText(me.guardian.email)).toBeVisible()

  // Enrollments-with-progress carries the per-course columns…
  await expect(page.getByRole('columnheader', { name: 'Attendance' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Grade' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Certificate' })).toBeVisible()
  // …and a passing Grade (>=70) shows the Passing treatment.
  await expect(page.getByText('Passing').first()).toBeVisible()

  // The certificates section renders (empty for this persona — no closed-course
  // pass yet, ADR-0024).
  await expect(page.getByRole('heading', { name: 'Certificates' })).toBeVisible()

  // Read-only: no Edit/Delete affordance anywhere on the hub.
  await expect(page.getByRole('button', { name: /edit/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0)
})

test('the profile renders in Spanish when locale is ES (#166)', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(
    ({ roleKey, userKey, localeKey }) => {
      window.localStorage.setItem(roleKey, 'student')
      window.localStorage.setItem(userKey, 'stu-1')
      window.localStorage.setItem(localeKey, 'es')
    },
    { roleKey: ROLE_KEY, userKey: USER_KEY, localeKey: LOCALE_KEY }
  )
  await page.goto('/app/me')

  // Scoped to main: the page's "Mi perfil" eyebrow, not the sidebar nav item of
  // the same name (strict mode).
  await expect(page.getByRole('main').getByText('Mi perfil')).toBeVisible()
  await expect(page.getByRole('heading', { name: meName })).toBeVisible()
})

test('a non-student visiting /app/me is redirected to their dashboard (#166)', async ({ page }) => {
  await enterAs(page, 'admin')
  await page.goto('/app/me')

  // Self-only is structural: a non-Student has no own record, so the page sends
  // them back to the dashboard — never a blank or another student's profile.
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole('heading', { name: meName })).toHaveCount(0)
})
