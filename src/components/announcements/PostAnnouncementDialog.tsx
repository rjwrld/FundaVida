import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AnnouncementComposer } from '@/components/announcements/AnnouncementComposer'
import { shortCourseName } from '@/lib/courseName'
import type { Course } from '@/types'

/**
 * The dashboard compose Dialog (#367): a picker over the viewer's composable
 * cohorts plus the shared {@link AnnouncementComposer}. Keeps the picker
 * semantics the inline footer composer had (#266): a sole composable Course is
 * preselected so a single-cohort Teacher posts without touching the picker;
 * with several, the picker stays on its "choose" placeholder until one is
 * chosen — posting has no undo (ADR-0040), so we never silently aim the box at
 * an unread cohort. A successful post closes the Dialog; closing resets the
 * pick so the next open starts from the placeholder again.
 */
export function PostAnnouncementDialog({
  open,
  onClose,
  courses,
}: {
  open: boolean
  onClose: () => void
  courses: Course[]
}) {
  const { t } = useTranslation()
  const [pickedCourseId, setPickedCourseId] = useState('')

  const soleCourseId = courses.length === 1 ? (courses[0]?.id ?? '') : ''
  const selectedCourseId = pickedCourseId || soleCourseId

  const close = () => {
    setPickedCourseId('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dashboard.announcements.compose.heading')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Select value={selectedCourseId} onValueChange={setPickedCourseId}>
            <SelectTrigger aria-label={t('dashboard.announcements.compose.selectCourse')}>
              <SelectValue placeholder={t('dashboard.announcements.compose.selectCourse')} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {shortCourseName(course)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AnnouncementComposer courseId={selectedCourseId} onPosted={close} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
