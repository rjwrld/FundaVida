import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Book, Calendar, AlertCircle } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useCourses } from '@/hooks/api/courses'
import { StatCard } from '@/components/shared/StatCard'
import { sessionsFor } from '@/lib/sessions'
import { parseISO, isBefore } from 'date-fns'
import type { Course } from '@/types'
import { DashboardShell } from './DashboardShell'

interface SessionWithCourse {
  date: string
  ordinal: number
  courseId: string
  courseName: string
}

/**
 * Find the next upcoming session across all of a teacher's courses.
 * Returns null if no upcoming sessions exist.
 */
function getNextUpcomingSession(courses: Course[]): SessionWithCourse | null {
  const now = new Date()
  const upcomingSessions = courses
    .flatMap((c) =>
      sessionsFor(c).map((s) => ({
        date: s.date,
        ordinal: s.ordinal,
        courseId: c.id,
        courseName: c.name,
      }))
    )
    .filter((s) => isBefore(now, parseISO(s.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return upcomingSessions[0] ?? null
}

/**
 * Count ended courses in a teacher's roster (courses where today >= term.end).
 */
function getEndedCoursesCount(courses: Course[]): number {
  const now = new Date()
  return courses.filter((c) => {
    const termEnd = parseISO(c.term.end)
    return !isBefore(now, termEnd)
  }).length
}

export function TeacherDashboard() {
  const { t } = useTranslation()
  const { data: courses = [] } = useCourses()

  const nextSession = useMemo(() => getNextUpcomingSession(courses), [courses])
  const endedCoursesCount = useMemo(() => getEndedCoursesCount(courses), [courses])

  // A Teacher acts on their own Courses' Sessions, so entries link into attendance (ADR-0013).
  return (
    <DashboardShell courses={courses} linkSessions>
      {/* My Courses */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.teacher.myCourses')}
          value={courses.length}
          icon={<Book className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Next Upcoming Session */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.teacher.nextSession')}
          value={nextSession ? 1 : 0}
          format={() => (nextSession ? nextSession.courseName : t('dashboard.teacher.noUpcoming'))}
          icon={<Calendar className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Ended Courses Awaiting Grades */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.teacher.endedCoursesAwaitingGrades')}
          value={endedCoursesCount}
          icon={<AlertCircle className="size-4" aria-hidden="true" />}
        />
      </motion.div>
    </DashboardShell>
  )
}
