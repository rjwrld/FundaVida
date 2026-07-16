import { useMemo } from 'react'
import { clock } from '@/lib/clock'
import { useStore } from '@/data/store'
import { dashboardStatDeltas, type StatDeltas } from '@/lib/stats'

export interface DashboardStats {
  totalStudents: number
  activeCourses: number
  certsIssued: number
  tcuHours: number
  deltas: StatDeltas
}

// Pure derived stats for the admin dashboard.
export function useDashboardStats(): DashboardStats {
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const certificates = useStore((s) => s.certificates)
  const tcuActivities = useStore((s) => s.tcuActivities)

  return useMemo(() => {
    const totalStudents = students.length

    // A course is "active" if it has at least one enrollment and has not been
    // closed (ADR-0024): a closed cohort with history must not count as active
    // forever. Draft/published both count while they have participants.
    const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId))
    const activeCourses = courses.filter(
      (c) => c.status !== 'closed' && enrolledCourseIds.has(c.id)
    ).length

    // A Certificate is "issued" the moment it exists — closing its Course emits it
    // already downloadable (ADR-0024). Approval is gone, so there is no pending count.
    const certsIssued = certificates.length

    const tcuHours = tcuActivities.reduce((sum, t) => sum + t.hours, 0)

    // Real month-over-month trend for each headline metric (vs end of last month).
    const deltas = dashboardStatDeltas(
      { students, courses, enrollments, certificates, tcuActivities },
      clock.now()
    )

    return {
      totalStudents,
      activeCourses,
      certsIssued,
      tcuHours,
      deltas,
    }
  }, [students, courses, enrollments, certificates, tcuActivities])
}
