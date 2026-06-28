import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Book, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useCourses } from '@/hooks/api/courses'
import { StatCard } from '@/components/shared/StatCard'
import { isBefore, parseISO } from 'date-fns'
import { clock } from '@/lib/clock'
import type { Course } from '@/types'
import { DashboardShell } from './DashboardShell'
import { TcuApprovalQueue } from '@/components/tcu/TcuApprovalQueue'
import { EnrollmentApprovalQueue } from '@/components/enrollments/EnrollmentApprovalQueue'
import { NextSessionsList } from './NextSessionsList'

/**
 * Count ended courses in a teacher's roster (courses where today >= term.end).
 */
function getEndedCoursesCount(courses: Course[]): number {
  const now = clock.now()
  return courses.filter((c) => {
    const termEnd = parseISO(c.term.end)
    return !isBefore(now, termEnd)
  }).length
}

/**
 * Filter ended courses so we can link to them.
 */
function getEndedCourses(courses: Course[]): Course[] {
  const now = clock.now()
  return courses.filter((c) => {
    const termEnd = parseISO(c.term.end)
    return !isBefore(now, termEnd)
  })
}

export function TeacherDashboard() {
  const { t } = useTranslation()
  const { data: courses = [] } = useCourses()

  const endedCoursesCount = useMemo(() => getEndedCoursesCount(courses), [courses])
  const endedCourses = useMemo(() => getEndedCourses(courses), [courses])

  // The sidebar calendar marks the Teacher's own Courses' Session days (ADR-0013).
  // Hero: Enrollment Approvals + Next Sessions to Mark
  // Supporting: My Courses, Ended Courses, TCU Approvals, Create Course CTA
  return (
    <DashboardShell courses={courses}>
      {/* Hero: Enrollment Approval Queue */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <EnrollmentApprovalQueue />
      </motion.div>

      {/* Hero: Next Sessions List */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <NextSessionsList courses={courses} />
      </motion.div>

      {/* Supporting: My Courses */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.teacher.myCourses')}
          value={courses.length}
          icon={<Book className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Supporting: Ended Courses with links */}
      {endedCoursesCount > 0 && (
        <motion.div variants={fadeUp} transition={transitionDefaults}>
          <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
            <header className="mb-4">
              <h3 className="font-display text-lg text-foreground">
                {t('dashboard.teacher.endedCoursesAwaitingGrades')}
              </h3>
            </header>
            <ul className="flex flex-1 flex-col divide-y divide-border/60">
              {endedCourses.map((course) => (
                <li key={course.id} className="py-2 first:pt-0 last:pb-0">
                  <Link
                    to={`/app/courses/${course.id}`}
                    className="text-sm font-medium text-foreground hover:text-brand-green-700 hover:underline"
                  >
                    {course.name}
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </motion.div>
      )}

      {/* Supporting: TCU Approval Queue */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <TcuApprovalQueue />
      </motion.div>

      {/* Supporting: Create a Course CTA */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <div className="rounded-lg border border-border bg-card p-6 shadow-card">
          <h3 className="text-lg font-semibold mb-2">{t('dashboard.teacher.createCourseTitle')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t('dashboard.teacher.createCourseDescription')}
          </p>
          <Button asChild>
            <Link to="/app/courses?new=true">
              <Plus size={16} className="mr-2" />
              {t('dashboard.teacher.createCourseButton')}
            </Link>
          </Button>
        </div>
      </motion.div>
    </DashboardShell>
  )
}
