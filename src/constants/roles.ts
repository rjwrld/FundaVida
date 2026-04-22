import type { Role } from '@/types'

export interface RoleMeta {
  value: Role
  label: string
  blurb: string
}

export const ROLES: RoleMeta[] = [
  {
    value: 'admin',
    label: 'Admin',
    blurb: 'Full access — manage students, courses, certificates.',
  },
  {
    value: 'teacher',
    label: 'Teacher',
    blurb: 'See assigned courses, grade students, track attendance.',
  },
  {
    value: 'student',
    label: 'Student',
    blurb: 'View enrolled courses, grades, and certificates.',
  },
  {
    value: 'tcu',
    label: 'TCU',
    blurb: 'Trainee / community-leader view of assigned activities.',
  },
]
