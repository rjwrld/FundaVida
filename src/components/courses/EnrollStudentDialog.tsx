import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useStore } from '@/data/store'
import { useEnrollStudent } from '@/hooks/api'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  courseId: string
}

export function EnrollStudentDialog({ open, onOpenChange, courseId }: Props) {
  const { t } = useTranslation()
  const students = useStore((s) => s.students)
  const enrollments = useStore((s) => s.enrollments)
  const enrolledIds = new Set(
    enrollments.filter((e) => e.courseId === courseId).map((e) => e.studentId)
  )
  const eligible = students.filter((s) => !enrolledIds.has(s.id))
  const [selected, setSelected] = useState<string>('')

  useEffect(() => {
    if (!open) setSelected('')
  }, [open])

  const enroll = useEnrollStudent()

  async function submit() {
    if (!selected) return
    await enroll.mutateAsync({ studentId: selected, courseId })
    setSelected('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('enrollments.dialog.title')}</DialogTitle>
          <DialogDescription>{t('enrollments.dialog.description')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>{t('enrollments.dialog.studentLabel')}</Label>
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger aria-label={t('enrollments.dialog.studentLabel')}>
              <SelectValue placeholder={t('enrollments.dialog.studentPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {eligible.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('enrollments.dialog.noStudents')}</p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.cancel')}
          </Button>
          <Button type="button" onClick={submit} disabled={!selected}>
            {t('enrollments.dialog.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
