import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format, parseISO, startOfDay } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useCreateSessionException } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import { clock } from '@/lib/clock'

/**
 * Which write the dialog performs (ADR-0039): `reschedule` moves an existing
 * future Session (its original `date` is carried through), `extra` adds a new one.
 * Cancellation is a one-click confirm, so it does not use this form.
 */
export type SessionExceptionMode = { kind: 'reschedule'; date: string } | { kind: 'extra' }

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  courseId: string
  mode: SessionExceptionMode | null
}

/** A `<input type="date">` value ('YYYY-MM-DD') → local-midnight ISO. */
function inputToIso(value: string): string {
  return startOfDay(parseISO(value)).toISOString()
}

/**
 * The reschedule / add-extra form (ADR-0039). The store enforces the real
 * integrity rules (future-only, no collision, attendance-guarded) and surfaces a
 * violation as an error toast; this form only collects a target date and an
 * optional note, and closes on success.
 */
export function SessionExceptionDialog({ open, onOpenChange, courseId, mode }: Props) {
  const { t } = useTranslation()
  const { formatDate } = useFormat()
  const createException = useCreateSessionException()
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')

  // Reset the fields whenever the dialog (re)opens for a new target.
  useEffect(() => {
    setDate('')
    setNote('')
  }, [open, mode])

  if (!mode) return null

  const isReschedule = mode.kind === 'reschedule'
  const todayInput = format(clock.today(), 'yyyy-MM-dd')

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!date || !mode) return
    try {
      await createException.mutateAsync({
        courseId,
        type: isReschedule ? 'rescheduled' : 'extra',
        date: isReschedule ? mode.date : inputToIso(date),
        newDate: isReschedule ? inputToIso(date) : undefined,
        note: note.trim() ? note.trim() : undefined,
      })
      onOpenChange(false)
    } catch {
      // The mutation's onError toast already reported the violation; keep the
      // dialog open so the teacher can pick a different date.
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isReschedule
              ? t('courses.detail.sessions.manage.rescheduleTitle')
              : t('courses.detail.sessions.manage.addTitle')}
          </DialogTitle>
          {isReschedule && (
            <DialogDescription>
              {t('courses.detail.sessions.manage.rescheduleFrom', {
                date: formatDate(mode.date),
              })}
            </DialogDescription>
          )}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="session-exception-date">
              {isReschedule
                ? t('courses.detail.sessions.manage.newDateLabel')
                : t('courses.detail.sessions.manage.dateLabel')}
            </Label>
            <Input
              id="session-exception-date"
              type="date"
              required
              min={todayInput}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="session-exception-note">
              {t('courses.detail.sessions.manage.noteLabel')}
            </Label>
            <Textarea
              id="session-exception-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" disabled={!date || createException.isPending}>
              {t('common.actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
