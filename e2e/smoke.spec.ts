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

  // The Q&A section (ADR-0049) answers the questions inline — no accordion. Assert
  // the section head, a numbered question, the re-homed infra delta, and the closing
  // source link all render on the landing.
  test('the Q&A section renders its questions, delta, and source link', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: "The questions you're probably about to ask." })
    ).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Is this a real product?' })).toBeVisible()
    await expect(page.getByText('Role switcher (no login)')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Read the source' })).toBeVisible()
  })

  // The stack grid (ADR-0049, #385) replaces the marquee: a bordered cell grid
  // of the real dependencies with the message in its center 2×2 cell.
  test('the stack grid renders its dependencies and the center message', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /It's all here\./i })).toBeVisible()
    // Exact match: these names live only in the grid, but "Zustand"/"Playwright"
    // also appear in the Q&A prose above.
    await expect(page.getByText('Recharts', { exact: true })).toBeVisible()
    await expect(page.getByText('TanStack Table', { exact: true })).toBeVisible()
  })

  // The proof marquee (ADR-0049, #386) sits between the hero and the Q&A: a
  // browser-framed row of real app screenshots. Assert the head, that a framed
  // shot renders, and that "Open the app" walks the visitor in as admin.
  test('the proof marquee renders and its head link enters as admin', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('A few screens from inside')).toBeVisible()
    // The marquee duplicates its row for the seamless loop, so shots repeat.
    await expect(page.getByRole('img', { name: /screen inside the app/i }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Open the app' }).click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { level: 1, name: /signed in as/i })).toBeVisible()
  })

  // The final CTA (ADR-0049, #385) reprises the persona badges small — same
  // entry as the hero. The mini badge has no capability line, so its exact aria
  // name (role + persona) disambiguates it from the hero's full badge.
  test('the final-CTA mini badge signs in and walks the visitor in', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: `Student ${fullName(student)}`, exact: true }).click()
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { level: 1, name: /signed in as/i })).toBeVisible()
  })

  test('the footer links out to the source, LinkedIn, and the foundation', async ({ page }) => {
    await page.goto('/')
    // Scope by the element: the footer sits inside <main>, so it is not exposed
    // as the contentinfo landmark, and "source" also matches the Q&A link.
    const footer = page.locator('footer')
    await expect(footer.getByRole('link', { name: /source/i })).toHaveAttribute(
      'href',
      'https://github.com/rjwrld/FundaVida'
    )
    await expect(footer.getByRole('link', { name: /linkedin/i })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/rjwrld/'
    )
    await expect(footer.getByRole('link', { name: /fundavida org/i })).toHaveAttribute(
      'href',
      'https://www.fundavida.org/'
    )
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
