import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Megaphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CourseStateBadge } from '@/components/courses/CourseStateBadge'
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

const FEED_LIMIT = 4

/**
 * The cross-Course announcements feed on every role dashboard (ADR-0043): the
 * latest few posts across the viewer's scoped Courses (admin all, teacher own,
 * student enrolled, TCU the assigned Course — the scope seam, ADR-0040), newest
 * first. Each row deep-links to its Course, where the full feed lives. Roles that
 * may compose (teacher/admin) also get a Post button in the header (#367) opening
 * {@link PostAnnouncementDialog} — a picker over their non-closed cohorts plus the
 * shared composer — so posting a note takes no detour through a Course detail page
 * while the feed card itself stays reading-only.
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

  // Whether to offer the inline composer. Admin composes unconditionally; a
  // Teacher composes on Courses they own — and the scoped Courses read here is
  // exactly their owned cohorts (ADR-0040), so any loaded Course proves the
  // capability. Passing that Course through the permission seam keeps the check
  // on the matrix (the `courseOwned` predicate) rather than a hardcoded role
  // list; student/TCU have no create cell and never see it.
  const firstCourse = coursesQuery.data?.[0]
  const canCompose = useCan(
    'create',
    'announcements',
    firstCourse ? { course: firstCourse } : undefined
  )

  const gate = resolveQueries([announcementsQuery, coursesQuery])
  if (gate.isPending) {
    return <SkeletonCard lines={4} data-testid="announcements-feed" />
  }

  const [announcements, courses] = gate.data
  const courseById = new Map<string, Course>(courses.map((c) => [c.id, c]))
  const items = announcements.slice(0, FEED_LIMIT)

  // The Dialog's Courses: the composer's own/all cohorts that are still live — the
  // same terminal-cohort gate the detail-page compose box uses (`canManageAnnouncements`,
  // ADR-0040), via the shared {@link isLiveCohort} predicate. With none composable
  // (e.g. every owned cohort closed), there is nowhere to post, so the Post button
  // is withheld.
  const composableCourses = courses.filter(isLiveCohort)
  const showCompose = canCompose && composableCourses.length > 0

  return (
    // `Card` renders a plain div, so the named region the old `<section>` carried
    // is restated here rather than dropped in the port.
    <Card
      className="h-full"
      role="region"
      aria-labelledby="dashboard-announcements-heading"
      data-testid="announcements-feed"
    >
      <CardHeader>
        <CardTitle as="h3" id="dashboard-announcements-heading" className="flex items-center gap-2">
          <Megaphone className="size-4 text-primary" aria-hidden="true" />
          {t('dashboard.announcements.title')}
        </CardTitle>
        {showCompose && (
          <CardAction>
            <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
              {t('dashboard.announcements.compose.cta')}
            </Button>
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="flex flex-1 flex-col">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('dashboard.announcements.empty')}</p>
        ) : (
          <ul className="flex flex-1 flex-col divide-y divide-border/60">
            {items.map((announcement) => (
              <FeedRow
                key={announcement.id}
                announcement={announcement}
                course={courseById.get(announcement.courseId) ?? null}
                formatDate={formatDate}
              />
            ))}
          </ul>
        )}
      </CardContent>

      {showCompose && (
        <PostAnnouncementDialog
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          courses={composableCourses}
        />
      )}
    </Card>
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
    <li className="py-3 first:pt-0 last:pb-0">
      <Link
        to={course ? `/app/courses/${course.id}` : '/app/courses'}
        className="group block rounded-md"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground group-hover:text-primary group-hover:underline">
            {course ? shortCourseName(course) : t('dashboard.announcements.unknownCourse')}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* The derived display-state badge (ADR-0042) rides every course row —
                this is where the Admin dashboard gains it (ADR-0043). */}
            {course && <CourseStateBadge course={course} />}
            {announcement.kind === 'sessionChange' && (
              <Badge variant="neutral">
                {t('courses.detail.announcements.kind.sessionChange')}
              </Badge>
            )}
          </div>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{announcement.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(announcement.createdAt)}</p>
      </Link>
    </li>
  )
}
