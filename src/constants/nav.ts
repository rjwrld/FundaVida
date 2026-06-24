import {
  Award,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  FileText,
  GraduationCap,
  HandHeart,
  LayoutDashboard,
  LucideIcon,
  Mail,
  ScrollText,
  UserCog,
  Users,
} from 'lucide-react'
import { can } from '@/permissions'
import type { Resource } from '@/permissions'
import type { Role } from '@/types'

export type NavSection = 'programs' | 'people' | 'reports'

export interface NavItem {
  to: string
  labelKey: string
  resource?: Resource
  section: NavSection
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/app',
    labelKey: 'nav.dashboard',
    section: 'programs',
    icon: LayoutDashboard,
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
    to: '/app/reports',
    labelKey: 'nav.reports',
    resource: 'reports',
    section: 'reports',
    icon: ClipboardList,
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
]

export const NAV_SECTIONS: NavSection[] = ['programs', 'people', 'reports']

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => {
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
