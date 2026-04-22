import type { Role } from '@/types'

export interface NavItem {
  to: string
  label: string
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app', label: 'Dashboard', roles: ['admin', 'teacher', 'student', 'tcu'] },
  { to: '/app/students', label: 'Students', roles: ['admin', 'teacher'] },
  { to: '/app/courses', label: 'Courses', roles: ['admin', 'teacher', 'student'] },
  { to: '/app/certificates', label: 'Certificates', roles: ['admin', 'student'] },
]

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
