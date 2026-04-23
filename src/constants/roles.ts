import type { Role } from '@/types'

export interface RoleMeta {
  value: Role
  labelKey: string
  blurbKey: string
}

export const ROLES: RoleMeta[] = [
  { value: 'admin', labelKey: 'roles.admin.label', blurbKey: 'roles.admin.blurb' },
  { value: 'teacher', labelKey: 'roles.teacher.label', blurbKey: 'roles.teacher.blurb' },
  { value: 'student', labelKey: 'roles.student.label', blurbKey: 'roles.student.blurb' },
  { value: 'tcu', labelKey: 'roles.tcu.label', blurbKey: 'roles.tcu.blurb' },
]
