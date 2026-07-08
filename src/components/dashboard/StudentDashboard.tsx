import { motion } from 'framer-motion'
import { fadeUp, transitionDefaults } from '@/lib/motion'
import { DashboardShell } from './DashboardShell'
import { StudentCoursesTable } from './StudentCoursesTable'
import { DashboardAnnouncementsFeed } from './DashboardAnnouncementsFeed'

/**
 * The Student's content-first landing surface (ADR-0043): the "My courses"
 * roll-up (buildStudentProgress, ADR-0032) answering "how am I doing where", and
 * the announcements feed across their enrolled Courses. The this-week agenda
 * slice and per-Course progress live in the shell aside ({@link DashboardShell}'s
 * AgendaSlice, ADR-0038). The old navigation shortcut cards (Browse, My profile)
 * are gone — the sidebar and Account nav already carry those jobs (ADR-0010).
 */
export function StudentDashboard() {
  return (
    <DashboardShell>
      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <StudentCoursesTable />
      </motion.div>

      <motion.div variants={fadeUp} transition={transitionDefaults}>
        <DashboardAnnouncementsFeed />
      </motion.div>
    </DashboardShell>
  )
}
