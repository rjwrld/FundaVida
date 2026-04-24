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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/shared/PageHeader'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  buildEmailCampaignSchema,
  type EmailCampaignFormValues,
} from '@/data/schemas/emailCampaign'
import { resolveRecipients } from '@/lib/emailRecipients'
import { useEmailCampaigns, useSendEmailCampaign } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import type { EmailFilter, EmailFilterKind } from '@/types'

export function BulkEmailPage() {
  const { t } = useTranslation()
  const { formatDateTime, formatNumber } = useFormat()
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const enrollments = useStore((s) => s.enrollments)
  const { data: history = [] } = useEmailCampaigns()
  const send = useSendEmailCampaign()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmailCampaignFormValues>({
    resolver: zodResolver(buildEmailCampaignSchema(t)),
    defaultValues: { subject: '', body: '', filterKind: 'all' },
  })

  const filterKind = watch('filterKind')
  const filterValue = watch('filterValue')

  const filter: EmailFilter = useMemo(
    () => ({ kind: filterKind, value: filterValue }),
    [filterKind, filterValue]
  )

  const recipients = useMemo(
    () => resolveRecipients(filter, { students, courses, enrollments }),
    [filter, students, courses, enrollments]
  )

  const programNames = useMemo(
    () => Array.from(new Set(courses.map((c) => c.programName))),
    [courses]
  )
  const provinceNames = useMemo(
    () => Array.from(new Set(students.map((s) => s.province))).sort(),
    [students]
  )

  async function onSubmit(values: EmailCampaignFormValues) {
    await send.mutateAsync({
      subject: values.subject,
      body: values.body,
      filter: { kind: values.filterKind, value: values.filterValue },
      recipientIds: recipients.map((s) => s.id),
    })
    reset({ subject: '', body: '', filterKind: 'all', filterValue: undefined })
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('bulkEmail.title')} description={t('bulkEmail.subtitle')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('bulkEmail.compose')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">{t('bulkEmail.fields.subject')}</Label>
              <Input id="subject" {...register('subject')} />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">{t('bulkEmail.fields.body')}</Label>
              <Textarea id="body" rows={6} {...register('body')} />
              {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
                  <Select
                    value={filterValue ?? ''}
                    onValueChange={(v) => setValue('filterValue', v)}
                  >
                    <SelectTrigger id="filterValue">
                      <SelectValue
                        placeholder={t('bulkEmail.filter.placeholder', {
                          dimension: t(`bulkEmail.dimensions.${filterKind}`),
                        })}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filterKind === 'program' &&
                        programNames.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
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
            </div>
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {recipients.length === 0
                ? t('bulkEmail.noRecipients')
                : t('bulkEmail.recipientCount', { count: recipients.length })}
            </p>
            <Button type="submit" disabled={isSubmitting || recipients.length === 0}>
              {isSubmitting ? t('bulkEmail.sending') : t('bulkEmail.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('bulkEmail.history.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('bulkEmail.history.empty')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bulkEmail.history.columns.subject')}</TableHead>
                  <TableHead>{t('bulkEmail.history.columns.filter')}</TableHead>
                  <TableHead className="text-right">
                    {t('bulkEmail.history.columns.recipients')}
                  </TableHead>
                  <TableHead>{t('bulkEmail.history.columns.sentAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.subject}</TableCell>
                    <TableCell>
                      {t(`bulkEmail.filter.${c.filter.kind}`)}
                      {c.filter.value ? `: ${c.filter.value}` : ''}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(c.recipientIds.length)}
                    </TableCell>
                    <TableCell>{formatDateTime(c.sentAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
