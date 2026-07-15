import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useStore, userIdForRole } from '@/data/store'
import { landingPathForRole } from '@/lib/roleLanding'
import { fullName } from '@/lib/personName'
import type { Role } from '@/types'

/**
 * The foundation's name — a proper noun, never passed through t() (the ADR-0017
 * rule). Shared by the admin persona badge (admin is a sentinel id, not a
 * seeded person, so its badge names the office — ADR-0049) and the footer's
 * provenance line, so a rename lands in one place.
 */
export const FOUNDATION_NAME = 'Fundación Vida'

/** The four roles in badge-deal order — shared by the hero and the final CTA. */
export const LANDING_ROLES: readonly Role[] = ['admin', 'teacher', 'student', 'tcu']

/**
 * The landing's role-entry handlers (ADR-0049), shared by the hero's persona
 * badges and the final CTA's mini-badge reprise so both walk a visitor in the
 * same way: `enterAs` signs in as a role and lands where the role should land
 * (the teacher badge inherits the golden-path drop onto its gradeable Course,
 * ADR-0007); `enterAsAdmin` is the explicit admin fast path allowed to
 * hard-code the role. `personaName` names the seeded person behind the role id,
 * or the office for the admin sentinel.
 */
export function useRoleEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const setRole = useStore((s) => s.setRole)
  const teachers = useStore((s) => s.teachers)
  const students = useStore((s) => s.students)
  const tcuTrainees = useStore((s) => s.tcuTrainees)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)

  const personaName = (role: Role): string => {
    const id = userIdForRole(role)
    switch (role) {
      case 'admin':
        return FOUNDATION_NAME
      case 'teacher': {
        const person = teachers.find((x) => x.id === id)
        return person ? fullName(person) : ''
      }
      case 'student': {
        const person = students.find((x) => x.id === id)
        return person ? fullName(person) : ''
      }
      case 'tcu': {
        const person = tcuTrainees.find((x) => x.id === id)
        return person ? fullName(person) : ''
      }
    }
  }

  const enterAs = (role: Role) => {
    setRole(role)
    navigate(
      landingPathForRole(role, { courses, enrollments, grades, currentUserId: userIdForRole(role) })
    )
  }

  const enterAsAdmin = () => {
    setRole('admin')
    navigate('/app')
  }

  return { t, personaName, enterAs, enterAsAdmin }
}
