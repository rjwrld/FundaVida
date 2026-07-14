import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCreateAnnouncement } from '@/hooks/api'

/** Matches the store's guard and the compose validation copy. */
export const BODY_MAX = 2000

/**
 * The shared announcement compose block (ADR-0040): a {@link BODY_MAX}-bounded,
 * trim-validated textarea that posts to `courseId` via {@link useCreateAnnouncement}
 * and clears on success. Used both on the course-scoped feed (fixed Course, ADR-0040)
 * and the dashboard composer (Course chosen from a picker, #266) so the compose block
 * lives in one place. An empty `courseId` (the dashboard picker before a Course is
 * chosen) disables the post button — there is nowhere to post to yet. `onPosted`
 * fires after a successful post so a Dialog host can close itself.
 */
export function AnnouncementComposer({
  courseId,
  onPosted,
}: {
  courseId: string
  onPosted?: () => void
}) {
  const { t } = useTranslation()
  const createAnnouncement = useCreateAnnouncement()
  const [body, setBody] = useState('')

  const trimmed = body.trim()
  const canSubmit = trimmed.length > 0 && courseId.length > 0 && !createAnnouncement.isPending

  const submit = () => {
    if (!canSubmit) return
    createAnnouncement.mutate(
      { courseId, body: trimmed },
      {
        onSuccess: () => {
          setBody('')
          onPosted?.()
        },
      }
    )
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        maxLength={BODY_MAX}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('courses.detail.announcements.compose.placeholder')}
        aria-label={t('courses.detail.announcements.compose.placeholder')}
      />
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={!canSubmit}>
          {t('courses.detail.announcements.compose.post')}
        </Button>
      </div>
    </div>
  )
}
