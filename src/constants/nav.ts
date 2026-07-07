import {
  Award,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CircleUserRound,
  FileText,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  Library,
  LucideIcon,
  Mail,
  ScrollText,
  UserCog,
  Users,
} from 'lucide-react'
import { can } from '@/permissions'
import type { Resource } from '@/permissions'
import type { Role } from '@/types'

export type NavSection = 'programs' | 'people' | 'reports' | 'account'

export interface NavItem {
  to: string
  labelKey: string
  resource?: Resource
  // For destinations whose access is structural rather than matrix-gated (like
  // /app/me, which reads self-scoped seams and redirects other roles), visibility
  // is pinned to these roles instead of a `resource`.
  roles?: Role[]
  section: NavSection
  icon: LucideIcon
  // Extra search aliases for the command palette (⌘K); the sidebar and drawer
  // ignore them. Lets a user reach a destination by a synonym of its label.
  keywords?: string[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/app',
    labelKey: 'nav.dashboard',
    section: 'programs',
    icon: LayoutDashboard,
    keywords: ['home'],
  },
  {
    // No `resource`: the calendar is role-scoped by its derived Sessions, not by a
    // permission, so it rides the existing Courses scope and shows for every role (ADR-0013).
    to: '/app/calendar',
    labelKey: 'nav.calendar',
    section: 'programs',
    icon: CalendarDays,
  },
  {
    // The read-only Program catalog (ADR-0015), derived from the matrix like
    // every other resource nav entry (ADR-0010); visible per-role, so it derives
    // away for tcu (ADR-0035).
    to: '/app/programs',
    labelKey: 'nav.programs',
    resource: 'programs',
    section: 'programs',
    icon: Library,
  },
  {
    to: '/app/courses',
    labelKey: 'nav.courses',
    resource: 'courses',
    section: 'programs',
    icon: BookOpen,
  },
  {
    to: '/app/certificates',
    labelKey: 'nav.certificates',
    resource: 'certificates',
    section: 'programs',
    icon: Award,
  },
  {
    to: '/app/students',
    labelKey: 'nav.students',
    resource: 'students',
    section: 'people',
    icon: GraduationCap,
  },
  {
    to: '/app/teachers',
    labelKey: 'nav.teachers',
    resource: 'teachers',
    section: 'people',
    icon: UserCog,
  },
  {
    to: '/app/enrollments',
    labelKey: 'nav.enrollments',
    resource: 'enrollments',
    section: 'people',
    icon: Users,
  },
  {
    to: '/app/grades',
    labelKey: 'nav.grades',
    resource: 'grades',
    section: 'reports',
    icon: FileText,
  },
  {
    to: '/app/attendance',
    labelKey: 'nav.attendance',
    resource: 'attendance',
    section: 'reports',
    icon: CalendarCheck2,
  },
  {
    to: '/app/tcu',
    labelKey: 'nav.tcu',
    resource: 'tcu',
    section: 'reports',
    icon: HandHeart,
  },
  {
    to: '/app/bulk-email',
    labelKey: 'nav.bulkEmail',
    resource: 'bulkEmail',
    section: 'reports',
    icon: Mail,
  },
  {
    to: '/app/audit-log',
    labelKey: 'nav.auditLog',
    resource: 'auditLog',
    section: 'reports',
    icon: ScrollText,
  },
  {
    // The Student's self-service profile (/app/me). Self-only is structural —
    // the page reads self-scoped seams and redirects any non-Student role — so
    // the entry is pinned to the student role rather than a matrix resource.
    to: '/app/me',
    labelKey: 'nav.myProfile',
    roles: ['student'],
    section: 'account',
    icon: CircleUserRound,
    keywords: ['profile', 'account'],
  },
]

export const NAV_SECTIONS: NavSection[] = ['programs', 'people', 'reports', 'account']

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(role)) return false
    if (!item.resource) return true
    return can(role, 'view', item.resource)
  })
}

export function groupNavByRole(role: Role): { section: NavSection; items: NavItem[] }[] {
  const items = navItemsForRole(role)
  return NAV_SECTIONS.map((section) => ({
    section,
    items: items.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0)
}
