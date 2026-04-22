import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { emailCampaignSchema, type EmailCampaignFormValues } from '@/data/schemas/emailCampaign'
import { resolveRecipients } from '@/lib/emailRecipients'
import { useEmailCampaigns, useSendEmailCampaign } from '@/hooks/api'
import { useStore } from '@/data/store'
import type { EmailFilter, EmailFilterKind } from '@/types'

export function BulkEmailPage() {
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
    resolver: zodResolver(emailCampaignSchema),
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
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bulk email</h1>
        <p className="text-sm text-muted-foreground">
          Compose a message, pick a recipient filter, preview the count, and send.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Compose</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" {...register('subject')} />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" rows={6} {...register('body')} />
              {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="filterKind">Recipient filter</Label>
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
                    <SelectItem value="all">All students</SelectItem>
                    <SelectItem value="program">By program</SelectItem>
                    <SelectItem value="province">By province</SelectItem>
                    <SelectItem value="course">By course</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filterKind !== 'all' && (
                <div className="space-y-1.5">
                  <Label htmlFor="filterValue">Value</Label>
                  <Select
                    value={filterValue ?? ''}
                    onValueChange={(v) => setValue('filterValue', v)}
                  >
                    <SelectTrigger id="filterValue">
                      <SelectValue placeholder="Pick one" />
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
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {recipients.length} recipient{recipients.length === 1 ? '' : 's'}.
            </p>
            <Button type="submit" disabled={isSubmitting || recipients.length === 0}>
              {isSubmitting ? 'Sending…' : 'Send'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Past campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Filter</TableHead>
                  <TableHead className="text-right">Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.subject}</TableCell>
                    <TableCell>
                      {c.filter.kind}
                      {c.filter.value ? `: ${c.filter.value}` : ''}
                    </TableCell>
                    <TableCell className="text-right">{c.recipientIds.length}</TableCell>
                    <TableCell>{new Date(c.sentAt).toLocaleDateString('en-US')}</TableCell>
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
