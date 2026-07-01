import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Book, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { useCourses } from '@/hooks/api/courses'
import { StatCard } from '@/components/shared/StatCard'
import { DashboardShell } from './DashboardShell'
import { CoursesToClose } from './CoursesToClose'
import { TcuApprovalQueue } from '@/components/tcu/TcuApprovalQueue'
import { EnrollmentApprovalQueue } from '@/components/enrollments/EnrollmentApprovalQueue'
import { NextSessionsList } from './NextSessionsList'

export function TeacherDashboard() {
  const { t } = useTranslation()
  const { data: courses = [] } = useCourses()

  // The sidebar calendar marks the Teacher's own Courses' Session days (ADR-0013).
  // Hero: Enrollment Approvals + Next Sessions to Mark
  // Supporting: My Courses, Courses to close, TCU Approvals, Create Course CTA
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

      {/* Supporting: Courses to close (Term ended, still published) */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <CoursesToClose />
      </motion.div>

      {/* Supporting: TCU Approval Queue */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <TcuApprovalQueue />
      </motion.div>

      {/* Supporting: Create a Course CTA */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
          <header className="mb-4">
            <h3 className="font-display text-lg text-foreground">
              {t('dashboard.teacher.createCourseTitle')}
            </h3>
          </header>
          <p className="mb-4 text-sm text-muted-foreground">
            {t('dashboard.teacher.createCourseDescription')}
          </p>
          <Button asChild>
            <Link to="/app/courses?new=true">
              <Plus size={16} className="mr-2" />
              {t('dashboard.teacher.createCourseButton')}
            </Link>
          </Button>
        </article>
      </motion.div>
    </DashboardShell>
  )
}
