import { motion } from 'framer-motion'
import { useCourses } from '@/hooks/api/courses'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { DashboardShell } from './DashboardShell'
import { NeedsMarkingWorklist } from './NeedsMarkingWorklist'
import { CoursesToClose } from './CoursesToClose'
import { NextSessionsList } from './NextSessionsList'
import { OwnCoursesList } from './OwnCoursesList'
import { DashboardAnnouncementsFeed } from './DashboardAnnouncementsFeed'
import { TcuApprovalQueue } from '@/components/tcu/TcuApprovalQueue'
import { EnrollmentApprovalQueue } from '@/components/enrollments/EnrollmentApprovalQueue'

/**
 * The Teacher's worklist-first dashboard (ADR-0043): the time-sensitive jobs lead
 * — Sessions that need marking (ADR-0044's hero, deep-linked), Courses ready to
 * close (ADR-0024), and the approval queues (enrollment requests + TCU hours) the
 * Teacher owns — then the supporting reads: upcoming Sessions, their own Courses
 * with display-state badges (ADR-0042), and the announcements feed with a compose
 * entry (ADR-0040). The old "Author a course" prompt card is gone; authoring
 * lives on the Courses page.
 *
 * (ADR-0019's "pending Certificate approvals" worklist no longer exists —
 * certificate approval was removed when close emits Certificates directly,
 * ADR-0024 — so the enrollment/TCU queues stand in as the Teacher's real
 * approval worklists.)
 */
export function TeacherDashboard() {
  const { data: courses = [] } = useCourses()

  return (
    <DashboardShell>
      {/* Worklists first — the time-sensitive jobs. */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <NeedsMarkingWorklist />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <CoursesToClose />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <EnrollmentApprovalQueue />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <TcuApprovalQueue />
      </motion.div>

      {/* Supporting reads. */}
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <NextSessionsList courses={courses} />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <OwnCoursesList />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <DashboardAnnouncementsFeed />
      </motion.div>
    </DashboardShell>
  )
}
