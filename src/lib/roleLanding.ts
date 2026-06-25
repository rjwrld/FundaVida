import { can } from '@/permissions'
import type { Course, Enrollment, Grade, Role } from '@/types'

interface LandingSnapshot {
  courses: Course[]
  enrollments: Enrollment[]
  grades: Grade[]
  currentUserId: string | null
}

/**
 * Where a freshly-switched role should land. The teacher persona drops straight
 * onto its ungraded ended Course — the golden-path entry of the demo (issue #72:
 * teacher grades → admin approves → student downloads) — so switching to the
 * role immediately offers real grading work. Every other role, and a teacher
 * with nothing left to grade, lands on the app home.
 *
 * "Ended and owned" is read from the permission matrix's enter-grades predicate
 * (ADR-0007), so the landing logic and the grading enforcement can never define
 * an ended Course differently. A Course only qualifies if it still has at least
 * one enrolled student without a Grade — once everything is graded, there is no
 * runway and the teacher lands on the home dashboard.
 */
export function landingPathForRole(role: Role, snapshot: LandingSnapshot): string {
  const { courses, enrollments, grades, currentUserId } = snapshot
  if (role !== 'teacher' || !currentUserId) return '/app'

  const runway = courses.find((course) => {
    if (!can(role, 'enter', 'grades', { userId: currentUserId, course })) return false
    const roster = enrollments.filter((e) => e.courseId === course.id)
    return roster.some(
      (e) => !grades.some((g) => g.studentId === e.studentId && g.courseId === course.id)
    )
  })

  return runway ? `/app/courses/${runway.id}` : '/app'
}
