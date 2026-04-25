import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  format,
  isSameMonth,
  isThisMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
  subYears,
} from 'date-fns'
import { GraduationCap, HeartHandshake } from 'lucide-react'
import { useStore } from '@/data/store'
import { PASSING_SCORE } from '@/lib/certificates'
import type { UpcomingItem } from '@/components/shared/UpcomingList'

export const TCU_TARGET_HOURS = 150
const TREND_MONTHS = 12
const HEATMAP_DAYS = 84

export interface EnrollmentTrendPoint {
  month: string
  current: number
  prior: number
}

export interface AttendanceHeatmapCell {
  date: string
  rate: number
}

export interface TopCourseDatum {
  id: string
  name: string
  count: number
}

export interface ReportsData {
  hasData: boolean
  totals: {
    students: number
    teachers: number
    courses: number
    enrollments: number
  }
  enrollmentTrend: EnrollmentTrendPoint[]
  attendance: AttendanceHeatmapCell[]
  averageGrade: number | null
  tcuCompleted: number
  tcuTarget: number
  certsThisMonth: number
  certsDelta: number
  topCourses: TopCourseDatum[]
  upcoming: UpcomingItem[]
}

export function useReportsData(): ReportsData {
  const { t } = useTranslation()
  const students = useStore((s) => s.students)
  const teachers = useStore((s) => s.teachers)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const grades = useStore((s) => s.grades)
  const attendance = useStore((s) => s.attendance)
  const tcuActivities = useStore((s) => s.tcuActivities)

  return useMemo(() => {
    const now = new Date()

    // Enrollment trend: 12 months current vs prior year, by enrolledAt month.
    const trendBuckets: EnrollmentTrendPoint[] = Array.from({ length: TREND_MONTHS }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, TREND_MONTHS - 1 - i))
      const priorStart = subYears(monthStart, 1)
      let current = 0
      let prior = 0
      enrollments.forEach((e) => {
        const enrolled = parseISO(e.enrolledAt)
        if (isSameMonth(enrolled, monthStart)) current += 1
        else if (isSameMonth(enrolled, priorStart)) prior += 1
      })
      return {
        month: format(monthStart, 'MMM'),
        current,
        prior,
      }
    })

    // Attendance heatmap: last 84 days (12 weeks × 7 days), one cell per day.
    // Both branches normalize through parseISO+format so the bucket key always
    // matches the local-day key produced for the grid, regardless of whether
    // sessionDate is a plain calendar string or an ISO datetime with offset.
    const today = startOfDay(now)
    const dailyTotals = new Map<string, { total: number; present: number }>()
    attendance.forEach((r) => {
      const dayKey = format(parseISO(r.sessionDate), 'yyyy-MM-dd')
      const bucket = dailyTotals.get(dayKey) ?? { total: 0, present: 0 }
      bucket.total += 1
      if (r.status === 'present') bucket.present += 1
      dailyTotals.set(dayKey, bucket)
    })
    const heatmap: AttendanceHeatmapCell[] = Array.from({ length: HEATMAP_DAYS }, (_, i) => {
      const day = subDays(today, HEATMAP_DAYS - 1 - i)
      const key = format(day, 'yyyy-MM-dd')
      const bucket = dailyTotals.get(key)
      const rate = bucket && bucket.total > 0 ? bucket.present / bucket.total : 0
      return { date: key, rate }
    })

    // Average grade: overall mean across all grades, null when no data.
    const averageGrade =
      grades.length === 0 ? null : grades.reduce((sum, g) => sum + g.score, 0) / grades.length

    // TCU completion: total hours summed.
    const tcuCompleted = tcuActivities.reduce((sum, a) => sum + a.hours, 0)

    // Certs this month / delta vs last month — proxy via passing grades issued in month.
    const lastMonthStart = startOfMonth(subMonths(now, 1))
    let certsThisMonth = 0
    let certsLastMonth = 0
    grades.forEach((g) => {
      if (g.score < PASSING_SCORE) return
      const issued = parseISO(g.issuedAt)
      if (isThisMonth(issued)) certsThisMonth += 1
      else if (isSameMonth(issued, lastMonthStart)) certsLastMonth += 1
    })
    const certsDelta = certsThisMonth - certsLastMonth

    // Top 5 courses by enrollment count.
    const enrollmentsByCourseId = new Map<string, number>()
    enrollments.forEach((e) => {
      enrollmentsByCourseId.set(e.courseId, (enrollmentsByCourseId.get(e.courseId) ?? 0) + 1)
    })
    const topCourses: TopCourseDatum[] = courses
      .map((c) => ({ id: c.id, name: c.name, count: enrollmentsByCourseId.get(c.id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Upcoming: 2 ungraded enrollments (warning) + 2 most recent TCU (success).
    const courseById = new Map(courses.map((c) => [c.id, c]))
    const gradedKeys = new Set(grades.map((g) => `${g.studentId}:${g.courseId}`))
    const upcoming: UpcomingItem[] = []

    const ungraded = enrollments.filter((e) => !gradedKeys.has(`${e.studentId}:${e.courseId}`))
    ungraded.slice(0, 2).forEach((e) => {
      const course = courseById.get(e.courseId)
      upcoming.push({
        id: `up-grade-${e.id}`,
        title: t('dashboard.upcoming.gradePending', { course: course?.name ?? e.courseId }),
        subtitle: course?.programName,
        variant: 'warning',
        icon: <GraduationCap className="size-4" aria-hidden />,
      })
    })

    const recentTcu = [...tcuActivities].sort((a, b) => (a.date > b.date ? -1 : 1)).slice(0, 2)
    recentTcu.forEach((tcu) => {
      upcoming.push({
        id: `up-tcu-${tcu.id}`,
        title: t('dashboard.upcoming.tcuLogged', { title: tcu.title }),
        subtitle: `${tcu.hours}h`,
        variant: 'success',
        icon: <HeartHandshake className="size-4" aria-hidden />,
      })
    })

    const totals = {
      students: students.length,
      teachers: teachers.length,
      courses: courses.length,
      enrollments: enrollments.length,
    }
    const hasData =
      totals.students > 0 || totals.teachers > 0 || totals.courses > 0 || totals.enrollments > 0

    return {
      hasData,
      totals,
      enrollmentTrend: trendBuckets,
      attendance: heatmap,
      averageGrade,
      tcuCompleted,
      tcuTarget: TCU_TARGET_HOURS,
      certsThisMonth,
      certsDelta,
      topCourses,
      upcoming,
    }
  }, [students, teachers, courses, enrollments, grades, attendance, tcuActivities, t])
}
