import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EmailCampaignForm } from '@/components/email/EmailCampaignForm'
import { shortCourseName } from '@/lib/courseName'
import type { Course } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  course: Course
}

/**
 * The teacher's (and admin's) "Message the class" surface (ADR-0041): the same
 * shared compose form as BulkEmailPage, locked to this Course — no duplicated
 * schema, no parallel mailer. The store re-checks Course ownership on send.
 */
export function MessageClassDialog({ open, onOpenChange, course }: Props) {
  const { t } = useTranslation()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('bulkEmail.messageClass.title')}</DialogTitle>
          <DialogDescription>
            {t('bulkEmail.messageClass.description', { course: shortCourseName(course) })}
          </DialogDescription>
        </DialogHeader>
        <EmailCampaignForm
          lockedCourse={course}
          onSent={() => onOpenChange(false)}
          submitFullWidth
        />
      </DialogContent>
    </Dialog>
  )
}
