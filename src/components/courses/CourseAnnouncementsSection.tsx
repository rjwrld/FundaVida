import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AnnouncementComposer } from '@/components/announcements/AnnouncementComposer'
import { NoResults } from '@/components/shared/NoResults'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDeleteAnnouncement } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import type { Announcement, Course } from '@/types'

interface CourseAnnouncementsSectionProps {
  course: Course
  /** The Course's feed, newest-first (the api sorts). */
  announcements: Announcement[]
  /**
   * Whether the viewer may compose and delete (ADR-0040): the Course's own
   * Teacher or admin, on a non-closed cohort. A scoped reader without it sees the
   * same list with no compose box and no delete controls.
   */
  canManage: boolean
  /**
   * The feed query is still resolving. Holds the empty state so a loading `[]`
   * never flashes "No announcements yet" before the real list arrives (ADR-0030).
   */
  isLoading?: boolean
}

/**
 * The course-scoped announcement feed (ADR-0040): a compose box for the Course's
 * Teacher/admin and a read-only list for every scoped role. Auto-posted
 * `sessionChange` entries (ADR-0039) sit inline with manual posts, tagged so the
 * class can tell a schedule change from a note. There is no edit — a correction is
 * a new post — so the only mutation of an existing post is delete.
 */
export function CourseAnnouncementsSection({
  course,
  announcements,
  canManage,
  isLoading = false,
}: CourseAnnouncementsSectionProps) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const deleteAnnouncement = useDeleteAnnouncement()
  const [pendingDelete, setPendingDelete] = useState<Announcement | null>(null)

  return (
    <section aria-labelledby="course-announcements-heading" className="space-y-3">
      <h2 id="course-announcements-heading" className="text-lg font-semibold tracking-tight">
        {t('courses.detail.announcements.heading')}
      </h2>

      {canManage && (
        <div className="rounded-md border bg-card p-3">
          <AnnouncementComposer courseId={course.id} />
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('courses.detail.loading')}</p>
      ) : announcements.length === 0 ? (
        <NoResults message={t('courses.detail.announcements.empty')} />
      ) : (
        <ul className="space-y-2">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              className="space-y-2 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-foreground">{announcement.body}</p>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setPendingDelete(announcement)}
                    aria-label={t('courses.detail.announcements.deleteNamed', {
                      date: formatDate(announcement.createdAt),
                    })}
                  >
                    {t('common.actions.delete')}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {announcement.kind === 'sessionChange' && (
                  <Badge variant="neutral">
                    {t('courses.detail.announcements.kind.sessionChange')}
                  </Badge>
                )}
                <span>{formatDate(announcement.createdAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t('courses.detail.announcements.deleteConfirm.title')}
        description={t('courses.detail.announcements.deleteConfirm.description')}
        confirmLabel={t('common.actions.delete')}
        destructive
        onConfirm={() => {
          if (pendingDelete) deleteAnnouncement.mutate(pendingDelete.id)
        }}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
      />
    </section>
  )
}
