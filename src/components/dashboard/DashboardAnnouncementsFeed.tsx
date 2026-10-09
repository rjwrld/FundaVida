import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Megaphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { WorklistCard, WorklistRow } from '@/components/shared/WorklistCard'
import { PostAnnouncementDialog } from '@/components/announcements/PostAnnouncementDialog'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { useAnnouncements } from '@/hooks/api/announcements'
import { useCourses } from '@/hooks/api/courses'
import { useCan } from '@/hooks/useCan'
import { resolveQueries } from '@/lib/resolveQueries'
import { isLiveCohort } from '@/lib/courseDisplayState'
import { shortCourseName } from '@/lib/courseName'
import { useFormat } from '@/hooks/useFormat'
import type { Announcement, Course } from '@/types'

const FEED_LIMIT = 2

/**
 * The slim announcements feed on the teacher, student, and TCU dashboards
 * (ADR-0043, slimmed by ADR-0050): the two newest posts across the viewer's
 * scoped Courses (teacher own, student enrolled, TCU the assigned Course — the
 * scope seam, ADR-0040), each row linking to its Course, where the full feed
 * lives. Roles that may compose (teacher/admin) get a Post button in the header
 * (#367) opening {@link PostAnnouncementDialog}. "View all" appears only when
 * the feed is one Course's: that Course's page is the full feed. A feed across
 * several Courses has no all-announcements page to send the viewer to, so it
 * offers no link rather than a misleading one.
 *
 * Derives from two scoped reads — the feed and the Courses (for the row's Course
 * name and the picker) — held behind {@link resolveQueries} (ADR-0030) so a
 * default-`[]` window never flashes "No announcements yet" before either resolves.
 */
export function DashboardAnnouncementsFeed({ courseId }: { courseId?: string }) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const announcementsQuery = useAnnouncements(courseId ? { courseId } : {})
  const coursesQuery = useCourses()
  const [composeOpen, setComposeOpen] = useState(false)

  // Whether to offer the composer. Admin composes unconditionally; a Teacher
  // composes on Courses they own — and the scoped Courses read here is exactly
  // their owned cohorts (ADR-0040), so any loaded Course proves the capability.
  // Passing that Course through the permission seam keeps the check on the
  // matrix (the `courseOwned` predicate) rather than a hardcoded role list;
  // student/TCU have no create cell and never see it.
  const firstCourse = coursesQuery.data?.[0]
  const canCompose = useCan(
    'create',
    'announcements',
    firstCourse ? { course: firstCourse } : undefined
  )

  const gate = resolveQueries([announcementsQuery, coursesQuery])
  if (gate.isPending) {
    return <SkeletonCard lines={3} data-testid="announcements-feed" />
  }

  const [announcements, courses] = gate.data
  const courseById = new Map<string, Course>(courses.map((c) => [c.id, c]))
  const items = announcements.slice(0, FEED_LIMIT)

  // The Dialog's Courses: the composer's own/all cohorts that are still live — the
  // same terminal-cohort gate the detail-page compose box uses (ADR-0040), via the
  // shared {@link isLiveCohort} predicate. With none composable, the Post button
  // is withheld.
  const composableCourses = courses.filter(isLiveCohort)
  const showCompose = canCompose && composableCourses.length > 0

  const feedCourseIds = new Set(announcements.map((a) => a.courseId))
  const singleCourseId = courseId ?? (feedCourseIds.size === 1 ? [...feedCourseIds][0] : undefined)

  return (
    <>
      <WorklistCard
        title={t('dashboard.announcements.title')}
        icon={Megaphone}
        emptyLabel={t('dashboard.announcements.empty')}
        action={
          showCompose ? (
            <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
              {t('dashboard.announcements.compose.cta')}
            </Button>
          ) : undefined
        }
        viewAll={
          singleCourseId && announcements.length > 0
            ? {
                to: `/app/courses/${singleCourseId}`,
                label: t('dashboard.announcements.viewAll'),
              }
            : undefined
        }
        data-testid="announcements-feed"
      >
        {items.map((announcement) => (
          <FeedRow
            key={announcement.id}
            announcement={announcement}
            course={courseById.get(announcement.courseId) ?? null}
            formatDate={formatDate}
          />
        ))}
      </WorklistCard>

      {showCompose && (
        <PostAnnouncementDialog
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          courses={composableCourses}
        />
      )}
    </>
  )
}

function FeedRow({
  announcement,
  course,
  formatDate,
}: {
  announcement: Announcement
  course: Course | null
  formatDate: (iso: string) => string
}) {
  const { t } = useTranslation()

  return (
    <WorklistRow
      to={course ? `/app/courses/${course.id}` : '/app/courses'}
      title={course ? shortCourseName(course) : t('dashboard.announcements.unknownCourse')}
      subtitle={formatDate(announcement.createdAt)}
      body={announcement.body}
      trailing={
        announcement.kind === 'sessionChange' ? (
          <Badge variant="neutral">{t('courses.detail.announcements.kind.sessionChange')}</Badge>
        ) : undefined
      }
    />
  )
}
