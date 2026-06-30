import { useMemo } from 'react'
import { isSameMonth, parseISO, startOfDay, subDays } from 'date-fns'
import { clock } from '@/lib/clock'
import { useStore } from '@/data/store'
import { mostRecentByDate } from '@/lib/utils'
import { dashboardStatDeltas, type StatDeltas } from '@/lib/stats'
import type { AuditLogEntry, Course, TcuActivity } from '@/types'

export interface TopCourse {
  id: string
  name: string
  programName: string
  enrollmentCount: number
}

export interface AttendanceTrendPoint {
  day: Date
  count: number
}

export interface DashboardStats {
  totalStudents: number
  activeCourses: number
  certsIssued: number
  tcuHours: number
  recentActivity: AuditLogEntry[]
  topCourses: TopCourse[]
  recentTcu: TcuActivity[]
  attendanceRate: number
  attendanceTrend: AttendanceTrendPoint[]
  courses: Course[]
  deltas: StatDeltas
}

// Pure derived stats for the admin dashboard.
export function useDashboardStats(): DashboardStats {
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const programs = useStore((s) => s.programs)
  const enrollments = useStore((s) => s.enrollments)
  const certificates = useStore((s) => s.certificates)
  const tcuActivities = useStore((s) => s.tcuActivities)
  const attendance = useStore((s) => s.attendance)
  const auditLog = useStore((s) => s.auditLog)

  return useMemo(() => {
    const totalStudents = students.length

    // Proxy: a course is "active" if it has at least one enrollment (no status field).
    const courseEnrollmentCounts = new Map<string, number>()
    enrollments.forEach((e) => {
      courseEnrollmentCounts.set(e.courseId, (courseEnrollmentCounts.get(e.courseId) ?? 0) + 1)
    })
    const activeCourses = courses.filter((c) => (courseEnrollmentCounts.get(c.id) ?? 0) > 0).length

    // A Certificate is "issued" the moment it exists — closing its Course emits it
    // already downloadable (ADR-0024). Approval is gone, so there is no pending count.
    const certsIssued = certificates.length

    const tcuHours = tcuActivities.reduce((sum, t) => sum + t.hours, 0)

    // Real month-over-month trend for each headline metric (vs end of last month).
    const deltas = dashboardStatDeltas(
      { students, enrollments, certificates, tcuActivities },
      clock.now()
    )

    // auditLog is newest-first (mutators unshift; seeded entries are sorted desc).
    const recentActivity = auditLog.slice(0, 5)

    const programNameById = new Map(programs.map((p) => [p.id, p.name]))
    const topCourses: TopCourse[] = [...courses]
      .map((c) => ({
        id: c.id,
        name: c.name,
        programName: programNameById.get(c.programId) ?? '',
        enrollmentCount: courseEnrollmentCounts.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
      .slice(0, 3)

    const recentTcu = mostRecentByDate(tcuActivities, 5)

    // Scope rate to the current calendar month so the label matches the data.
    const monthRecords = attendance.filter((a) => isSameMonth(parseISO(a.sessionDate), clock.now()))
    const attendanceRate =
      monthRecords.length === 0
        ? 0
        : Math.round(
            (monthRecords.filter((a) => a.status === 'present').length / monthRecords.length) * 100
          )

    // Strict last-7-calendar-days window (today + 6 prior). Deterministic regardless of seed gaps.
    const today = clock.today()
    const attendanceTrend: AttendanceTrendPoint[] = Array.from({ length: 7 }, (_, i) => {
      const day = subDays(today, 6 - i)
      const dayTime = day.getTime()
      const count = attendance.filter(
        (a) => a.status === 'present' && startOfDay(parseISO(a.sessionDate)).getTime() === dayTime
      ).length
      return { day, count }
    })

    return {
      totalStudents,
      activeCourses,
      certsIssued,
      tcuHours,
      recentActivity,
      topCourses,
      recentTcu,
      attendanceRate,
      attendanceTrend,
      courses,
      deltas,
    }
  }, [students, courses, programs, enrollments, certificates, tcuActivities, attendance, auditLog])
}
