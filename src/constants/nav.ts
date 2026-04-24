import {
  Award,
  BookOpen,
  CalendarCheck2,
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
import type { Role } from '@/types'

export type NavSection = 'programs' | 'people' | 'reports'

export interface NavItem {
  to: string
  labelKey: string
  roles: Role[]
  section: NavSection
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/app',
    labelKey: 'nav.dashboard',
    roles: ['admin', 'teacher', 'student', 'tcu'],
    section: 'programs',
    icon: LayoutDashboard,
  },
  {
    to: '/app/courses',
    labelKey: 'nav.courses',
    roles: ['admin', 'teacher', 'student'],
    section: 'programs',
    icon: BookOpen,
  },
  {
    to: '/app/certificates',
    labelKey: 'nav.certificates',
    roles: ['admin', 'student'],
    section: 'programs',
    icon: Award,
  },
  {
    to: '/app/students',
    labelKey: 'nav.students',
    roles: ['admin', 'teacher'],
    section: 'people',
    icon: GraduationCap,
  },
  {
    to: '/app/teachers',
    labelKey: 'nav.teachers',
    roles: ['admin'],
    section: 'people',
    icon: UserCog,
  },
  {
    to: '/app/enrollments',
    labelKey: 'nav.enrollments',
    roles: ['admin'],
    section: 'people',
    icon: Users,
  },
  {
    to: '/app/reports',
    labelKey: 'nav.reports',
    roles: ['admin'],
    section: 'reports',
    icon: ClipboardList,
  },
  {
    to: '/app/grades',
    labelKey: 'nav.grades',
    roles: ['admin'],
    section: 'reports',
    icon: FileText,
  },
  {
    to: '/app/attendance',
    labelKey: 'nav.attendance',
    roles: ['admin', 'teacher', 'student'],
    section: 'reports',
    icon: CalendarCheck2,
  },
  {
    to: '/app/tcu',
    labelKey: 'nav.tcu',
    roles: ['admin', 'student', 'tcu'],
    section: 'reports',
    icon: HandHeart,
  },
  {
    to: '/app/bulk-email',
    labelKey: 'nav.bulkEmail',
    roles: ['admin'],
    section: 'reports',
    icon: Mail,
  },
  {
    to: '/app/audit-log',
    labelKey: 'nav.auditLog',
    roles: ['admin'],
    section: 'reports',
    icon: ScrollText,
  },
]

export const NAV_SECTIONS: NavSection[] = ['programs', 'people', 'reports']

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function groupNavByRole(role: Role): { section: NavSection; items: NavItem[] }[] {
  const items = navItemsForRole(role)
  return NAV_SECTIONS.map((section) => ({
    section,
    items: items.filter((item) => item.section === section),
  })).filter((group) => group.items.length > 0)
}
