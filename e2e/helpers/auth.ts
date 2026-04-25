import type { Page } from '@playwright/test'

type Role = 'admin' | 'teacher' | 'student' | 'tcu'

const ROLE_KEY = 'fundavida:v1:role'
const CURRENT_USER_KEY = 'fundavida:v1:current-user'

const USER_ID_FOR_ROLE: Record<Role, string> = {
  admin: 'admin',
  teacher: 'tea-1',
  student: 'stu-1',
  tcu: 'tcu-1',
}

/**
 * Seed the role + matching demo user in localStorage and land directly on /app.
 * Use this when a test needs a non-admin role; the new landing only exposes
 * "Enter as admin" on screen, so non-admin paths can no longer be reached
 * by clicking through the UI.
 */
export async function enterAs(page: Page, role: Role) {
  await page.goto('/')
  await page.evaluate(
    ({ roleKey, userKey, role, userId }) => {
      window.localStorage.setItem(roleKey, role)
      window.localStorage.setItem(userKey, userId)
    },
    {
      roleKey: ROLE_KEY,
      userKey: CURRENT_USER_KEY,
      role,
      userId: USER_ID_FOR_ROLE[role],
    }
  )
  await page.goto('/app')
}
