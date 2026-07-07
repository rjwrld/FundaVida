import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Book, CheckCircle2, Search, Clock, UserCircle } from 'lucide-react'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useCourses } from '@/hooks/api/courses'
import { useAttendance } from '@/hooks/api/attendance'
import { StatCard } from '@/components/shared/StatCard'
import { parseISO, startOfDay, startOfMonth } from 'date-fns'
import { clock } from '@/lib/clock'
import { upcomingSessions } from '@/lib/sessions'
import { DashboardShell } from './DashboardShell'

export function StudentDashboard() {
  const { t } = useTranslation()
  const { data: courses = [] } = useCourses()
  const { data: attendance = [] } = useAttendance()

  const nextClass = useMemo(() => upcomingSessions(courses, clock.today(), 1)[0] ?? null, [courses])

  // Calculate attendance rate for this month
  const attendanceRate = useMemo(() => {
    const today = clock.today()
    const monthStart = startOfMonth(today)
    const monthRecords = attendance.filter((a) => {
      const sessionDate = parseISO(a.sessionDate)
      return startOfDay(sessionDate) >= monthStart
    })

    if (monthRecords.length === 0) return 0
    return Math.round(
      (monthRecords.filter((a) => a.status === 'present').length / monthRecords.length) * 100
    )
  }, [attendance])

  // The sidebar calendar marks the Student's enrolled Courses' Session days (ADR-0013).
  // Hero: Next Class + Browse Open Courses
  // Supporting: My Courses, Attendance Rate
  return (
    <DashboardShell courses={courses}>
      {/* Hero: Next Class */}
      {nextClass && (
        <motion.div variants={fadeUp} transition={transitionDefaults}>
          <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
            <header className="mb-4 flex items-center gap-2">
              <Clock
                className="size-4 text-brand-green-700 dark:text-brand-green-300"
                aria-hidden="true"
              />
              <h3 className="font-display text-lg text-foreground">
                {t('dashboard.student.nextClass')}
              </h3>
            </header>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{nextClass.courseName}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {t('calendar.sessionEntry', {
                  course: nextClass.courseName,
                  ordinal: String(nextClass.ordinal),
                } as Record<string, string>)}
              </p>
            </div>
          </article>
        </motion.div>
      )}

      {/* Hero: Browse Open Courses */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <Link
          to="/app/courses/browse"
          className="flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/30"
        >
          <header className="mb-4 flex items-center gap-2">
            <Search
              className="size-4 text-brand-green-700 dark:text-brand-green-300"
              aria-hidden="true"
            />
            <h3 className="font-display text-lg text-foreground">
              {t('dashboard.student.browseOpenCourses')}
            </h3>
          </header>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.student.browseDescription')}
          </p>
        </Link>
      </motion.div>

      {/* Hero: My Profile — the Student's self-service hub (issue #166). */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <Link
          to="/app/me"
          className="flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/30"
        >
          <header className="mb-4 flex items-center gap-2">
            <UserCircle
              className="size-4 text-brand-green-700 dark:text-brand-green-300"
              aria-hidden="true"
            />
            <h3 className="font-display text-lg text-foreground">
              {t('dashboard.student.myProfile')}
            </h3>
          </header>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.student.myProfileDescription')}
          </p>
        </Link>
      </motion.div>

      {/* Supporting: My Courses */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.student.myCourses')}
          value={courses.length}
          icon={<Book className="size-4" aria-hidden="true" />}
        />
      </motion.div>

      {/* Supporting: Attendance Rate */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StatCard
          label={t('dashboard.student.attendanceRate')}
          value={attendanceRate}
          format={(v) => `${v}%`}
          icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
        />
      </motion.div>
    </DashboardShell>
  )
}
