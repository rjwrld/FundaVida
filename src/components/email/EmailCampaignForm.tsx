import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildEmailCampaignSchema,
  type EmailCampaignFormValues,
} from '@/data/schemas/emailCampaign'
import { recipientEmails, resolveRecipients } from '@/lib/emailRecipients'
import { useSendEmailCampaign } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { Course, EmailAudience, EmailFilter, EmailFilterKind } from '@/types'

const AUDIENCES: EmailAudience[] = ['students', 'guardians', 'both']

interface Props {
  /**
   * When set, the compose form is locked to this Course (ADR-0041): the recipient
   * filter is fixed to `{ kind: 'course', value: course.id }` and the filter
   * selectors are hidden. This is the teacher's "Message the class" path; the
   * store still re-checks Course ownership on send. Omit it for the admin's broad
   * BulkEmail surface, which keeps the full filter picker.
   */
  lockedCourse?: Course
  /** Called after a campaign is sent (e.g. to close the dialog). */
  onSent?: () => void
  /** Submit button variant/size passthrough for the two mounts. */
  submitFullWidth?: boolean
}

export function EmailCampaignForm({ lockedCourse, onSent, submitFullWidth }: Props) {
  const { t } = useTranslation()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const programs = useStore((s) => s.programs)
  const enrollments = useStore((s) => s.enrollments)
  const send = useSendEmailCampaign()

  // The empty form: locked to the Course on the teacher's per-Course path, or an
  // open filter on the admin's broad surface. Used for both initial defaults and
  // the post-send reset, so the two can't drift.
  const emptyValues: EmailCampaignFormValues = {
    subject: '',
    body: '',
    filterKind: lockedCourse ? 'course' : 'all',
    filterValue: lockedCourse?.id,
    audience: 'students',
  }

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmailCampaignFormValues>({
    resolver: zodResolver(buildEmailCampaignSchema(t)),
    defaultValues: emptyValues,
  })

  const filterKind = watch('filterKind')
  const filterValue = watch('filterValue')
  const audience = watch('audience')

  const filter: EmailFilter = useMemo(
    () => ({ kind: filterKind, value: filterValue }),
    [filterKind, filterValue]
  )

  // Resolve target Students, then the distinct emails the audience reaches — the
  // preview counts emails, not Students (ADR-0041), so 'both' is honest.
  const recipients = useMemo(
    () => resolveRecipients(filter, { students, courses, enrollments }),
    [filter, students, courses, enrollments]
  )
  const emailCount = useMemo(
    () => recipientEmails(recipients, audience).length,
    [recipients, audience]
  )

  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const programOptions = useMemo(() => {
    const usedIds = Array.from(new Set(courses.map((c) => c.programId)))
    return usedIds.map((id) => programById.get(id)).filter((p) => p !== undefined)
  }, [courses, programById])
  const provinceNames = useMemo(
    () => Array.from(new Set(students.map((s) => s.province))).sort(),
    [students]
  )

  async function onSubmit(values: EmailCampaignFormValues) {
    await send.mutateAsync({
      subject: values.subject,
      body: values.body,
      filter: { kind: values.filterKind, value: values.filterValue },
      audience: values.audience,
      recipientIds: recipients.map((s) => s.id),
    })
    reset(emptyValues)
    onSent?.()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="subject">{t('bulkEmail.fields.subject')}</Label>
        <Input id="subject" {...register('subject')} />
        {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">{t('bulkEmail.fields.body')}</Label>
        <Textarea id="body" rows={6} {...register('body')} />
        {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* The recipient filter is the admin's broad-audience surface. On the
            teacher's per-Course path it is locked away — the Course is the filter. */}
        {!lockedCourse && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="filterKind">{t('bulkEmail.fields.filter')}</Label>
              <Select
                value={filterKind}
                onValueChange={(v) => {
                  setValue('filterKind', v as EmailFilterKind)
                  setValue('filterValue', undefined)
                }}
              >
                <SelectTrigger id="filterKind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('bulkEmail.filter.all')}</SelectItem>
                  <SelectItem value="program">{t('bulkEmail.filter.program')}</SelectItem>
                  <SelectItem value="province">{t('bulkEmail.filter.province')}</SelectItem>
                  <SelectItem value="course">{t('bulkEmail.filter.course')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {filterKind !== 'all' && (
              <div className="space-y-1.5">
                <Label htmlFor="filterValue">{t('bulkEmail.fields.filterValue')}</Label>
                <Select value={filterValue ?? ''} onValueChange={(v) => setValue('filterValue', v)}>
                  <SelectTrigger id="filterValue">
                    <SelectValue
                      placeholder={t('bulkEmail.filter.placeholder', {
                        dimension: t(`bulkEmail.dimensions.${filterKind}`),
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {filterKind === 'program' &&
                      programOptions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    {filterKind === 'province' &&
                      provinceNames.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    {filterKind === 'course' &&
                      courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.filterValue && (
                  <p className="text-sm text-destructive">{errors.filterValue.message}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Audience: who each targeted Student maps to (ADR-0041). */}
        <div className="space-y-1.5">
          <Label htmlFor="audience">{t('bulkEmail.fields.audience')}</Label>
          <Select value={audience} onValueChange={(v) => setValue('audience', v as EmailAudience)}>
            <SelectTrigger id="audience">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCES.map((a) => (
                <SelectItem key={a} value={a}>
                  {t(`bulkEmail.audience.${a}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {emailCount === 0
          ? t('bulkEmail.noRecipients')
          : t('bulkEmail.recipientCount', { count: emailCount })}
      </p>
      {/* Simulated send: the campaign row + audit entry are the proof, nothing
          leaves the browser (ADR-0041). */}
      <p className="text-xs text-muted-foreground">{t('bulkEmail.demoNote')}</p>

      <Button
        type="submit"
        disabled={isSubmitting || emailCount === 0}
        className={submitFullWidth ? 'w-full' : undefined}
      >
        {isSubmitting ? t('bulkEmail.sending') : t('bulkEmail.submit')}
      </Button>
    </form>
  )
}
