import { useMemo } from 'react'
import { isThisMonth, parseISO, startOfDay, subDays } from 'date-fns'
import { useStore } from '@/data/store'
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
  pendingApprovals: number
  recentActivity: AuditLogEntry[]
  topCourses: TopCourse[]
  recentTcu: TcuActivity[]
  attendanceRate: number
  attendanceTrend: AttendanceTrendPoint[]
  courses: Course[]
}

// Pure derived stats for the admin dashboard. Several fields are proxies
// because the seed schema lacks an explicit Certificate entity (Phase 8 PR 7
// will introduce one). Proxies are documented inline.
export function useDashboardStats(): DashboardStats {
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
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

    // Proxy: certificate issued = passing grade (>=70). No Certificate entity exists.
    const certsIssued = grades.filter((g) => g.score >= 70).length

    // Proxy: pending approval = enrollment without a grade row yet (awaiting grade entry).
    const gradeKeys = new Set(grades.map((g) => `${g.studentId}:${g.courseId}`))
    const pendingApprovals = enrollments.filter(
      (e) => !gradeKeys.has(`${e.studentId}:${e.courseId}`)
    ).length

    const tcuHours = tcuActivities.reduce((sum, t) => sum + t.hours, 0)

    // auditLog is newest-first (mutators unshift; seeded entries are sorted desc).
    const recentActivity = auditLog.slice(0, 5)

    const topCourses: TopCourse[] = [...courses]
      .map((c) => ({
        id: c.id,
        name: c.name,
        programName: c.programName,
        enrollmentCount: courseEnrollmentCounts.get(c.id) ?? 0,
      }))
      .sort((a, b) => b.enrollmentCount - a.enrollmentCount)
      .slice(0, 3)

    const recentTcu = [...tcuActivities].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 5)

    // Scope rate to the current calendar month so the label matches the data.
    const monthRecords = attendance.filter((a) => isThisMonth(parseISO(a.sessionDate)))
    const attendanceRate =
      monthRecords.length === 0
        ? 0
        : Math.round(
            (monthRecords.filter((a) => a.status === 'present').length / monthRecords.length) * 100
          )

    // Strict last-7-calendar-days window (today + 6 prior). Deterministic regardless of seed gaps.
    const today = startOfDay(new Date())
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
      pendingApprovals,
      recentActivity,
      topCourses,
      recentTcu,
      attendanceRate,
      attendanceTrend,
      courses,
    }
  }, [students, courses, enrollments, grades, tcuActivities, attendance, auditLog])
}
