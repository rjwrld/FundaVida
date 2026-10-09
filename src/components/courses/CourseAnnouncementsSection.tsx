import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PostAnnouncementDialog } from '@/components/announcements/PostAnnouncementDialog'
import { NoResults } from '@/components/shared/NoResults'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDeleteAnnouncement } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import type { Announcement, Course } from '@/types'
import { SectionHeader } from '@/components/shared/SectionHeader'

interface CourseAnnouncementsSectionProps {
  course: Course
  /** The Course's feed, newest-first (the api sorts). */
  announcements: Announcement[]
  /**
   * Whether the viewer may compose and delete (ADR-0040): the Course's own
   * Teacher or admin, on a non-closed cohort. A scoped reader without it sees the
   * same list with no Post button and no delete controls.
   */
  canManage: boolean
  /**
   * The feed query is still resolving. Holds the empty state so a loading `[]`
   * never flashes "No announcements yet" before the real list arrives (ADR-0030).
   */
  isLoading?: boolean
}

/**
 * The course-scoped announcement feed (ADR-0040): a Post button for the Course's
 * Teacher/admin and a read-only list for every scoped role. The section renders
 * only when it has posts or the viewer can post (ADR-0051) — an empty feed nobody
 * can write to is noise. Auto-posted
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
  const [composeOpen, setComposeOpen] = useState(false)

  // A reader who cannot post sees the section only once there is something to read.
  if (!canManage && (isLoading || announcements.length === 0)) return null

  return (
    <section aria-labelledby="course-announcements-heading" className="space-y-3">
      <SectionHeader
        id="course-announcements-heading"
        title={t('courses.detail.announcements.heading')}
        action={
          canManage ? (
            <Button size="sm" variant="outline" onClick={() => setComposeOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              {t('courses.detail.announcements.compose.post')}
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('courses.detail.loading')}</p>
      ) : announcements.length === 0 ? (
        <NoResults message={t('courses.detail.announcements.empty')} />
      ) : (
        <ul className="divide-y divide-border/60 rounded-md border bg-card">
          {announcements.map((announcement) => (
            <li
              key={announcement.id}
              className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 px-3 py-2 text-sm"
            >
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-foreground">
                {announcement.body}
              </p>
              <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {announcement.kind === 'sessionChange' && (
                  <Badge variant="neutral">
                    {t('courses.detail.announcements.kind.sessionChange')}
                  </Badge>
                )}
                <span className="font-mono tabular-nums">{formatDate(announcement.createdAt)}</span>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDelete(announcement)}
                    aria-label={t('courses.detail.announcements.deleteNamed', {
                      date: formatDate(announcement.createdAt),
                    })}
                  >
                    {t('common.actions.delete')}
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <PostAnnouncementDialog
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          courses={[course]}
          courseIsContext
        />
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
