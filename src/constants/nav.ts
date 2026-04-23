import type { Role } from '@/types'

export interface NavItem {
  to: string
  labelKey: string
  roles: Role[]
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/app', labelKey: 'nav.dashboard', roles: ['admin', 'teacher', 'student', 'tcu'] },
  { to: '/app/students', labelKey: 'nav.students', roles: ['admin', 'teacher'] },
  { to: '/app/teachers', labelKey: 'nav.teachers', roles: ['admin'] },
  { to: '/app/enrollments', labelKey: 'nav.enrollments', roles: ['admin'] },
  { to: '/app/courses', labelKey: 'nav.courses', roles: ['admin', 'teacher', 'student'] },
  { to: '/app/grades', labelKey: 'nav.grades', roles: ['admin'] },
  { to: '/app/attendance', labelKey: 'nav.attendance', roles: ['admin', 'teacher', 'student'] },
  { to: '/app/reports', labelKey: 'nav.reports', roles: ['admin'] },
  { to: '/app/certificates', labelKey: 'nav.certificates', roles: ['admin', 'student'] },
  { to: '/app/tcu', labelKey: 'nav.tcu', roles: ['admin', 'student', 'tcu'] },
  { to: '/app/audit-log', labelKey: 'nav.auditLog', roles: ['admin'] },
  { to: '/app/bulk-email', labelKey: 'nav.bulkEmail', roles: ['admin'] },
]

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}
