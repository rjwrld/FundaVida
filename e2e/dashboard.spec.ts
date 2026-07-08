import { test, expect } from '@playwright/test'
import { enterAs } from './helpers/auth'
import { seedDemo } from '../src/data/seed'
import { shortCourseName } from '../src/lib/courseName'

// Anchors derived from the seed's structural graph (faker.seed(42),
// epoch-independent — ADR-0002) so the spec follows the demo data. stu-1 is the
// Student persona enterAs('student') logs in as.
const world = seedDemo(new Date())
const enrollment = world.enrollments.find((e) => e.studentId === 'stu-1' && e.status === 'approved')
if (!enrollment) throw new Error('seed: stu-1 has no approved enrollment')
const enrolledCourse = world.courses.find((c) => c.id === enrollment.courseId)
if (!enrolledCourse) throw new Error('seed: enrolled course missing')
const courseLinkName = shortCourseName(enrolledCourse)

test('the student My-courses table deep-links to a course detail (ADR-0043)', async ({ page }) => {
  await enterAs(page, 'student')

  // The content-first dashboard leads with the My-courses roll-up table.
  await expect(page.getByRole('heading', { name: 'My courses' })).toBeVisible()

  // Each row's Course cell is a deep link. The DataTable dual-renders a mobile
  // card stack (sm:hidden) alongside the desktop table, so at the default desktop
  // width the card copy is display:none — getByRole reads the a11y tree and sees
  // exactly the visible table link, dodging the strict-mode dual-render trap.
  const courseLink = page.getByRole('link', { name: courseLinkName }).first()
  await expect(courseLink).toBeVisible()
  await courseLink.click()

  await expect(page).toHaveURL(new RegExp(`/app/courses/${enrolledCourse.id}$`))
})
