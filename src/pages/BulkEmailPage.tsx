import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
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
import { EmailCampaignForm } from '@/components/email/EmailCampaignForm'
import { recipientEmails } from '@/lib/emailRecipients'
import { useEmailCampaigns } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'

export function BulkEmailPage() {
  const { t } = useTranslation()
  const { formatDateTime, formatNumber } = useFormat()
  const students = useStore((s) => s.students)
  const programs = useStore((s) => s.programs)
  const { data: history = [] } = useEmailCampaigns()

  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])

  return (
    <div className="space-y-6">
      <PageHeader title={t('bulkEmail.title')} description={t('bulkEmail.subtitle')} />

      <Card>
        <CardHeader>
          <CardTitle>{t('bulkEmail.compose')}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailCampaignForm />
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
                  <TableHead>{t('bulkEmail.history.columns.audience')}</TableHead>
                  <TableHead className="text-right">
                    {t('bulkEmail.history.columns.recipients')}
                  </TableHead>
                  <TableHead>{t('bulkEmail.history.columns.sentAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => {
                  // The recipient count is over emails, not Students (ADR-0041):
                  // reproduce the sent audience's email list from the stored
                  // recipient Students.
                  const recipientStudents = c.recipientIds
                    .map((id) => studentById.get(id))
                    .filter((s) => s !== undefined)
                  const emailCount = recipientEmails(recipientStudents, c.audience).length
                  return (
                    <TableRow key={c.id}>
                      <TableCell>{c.subject}</TableCell>
                      <TableCell>
                        {t(`bulkEmail.filter.${c.filter.kind}`)}
                        {c.filter.value
                          ? `: ${
                              c.filter.kind === 'program'
                                ? (programById.get(c.filter.value)?.name ?? c.filter.value)
                                : c.filter.value
                            }`
                          : ''}
                      </TableCell>
                      <TableCell>{t(`bulkEmail.audience.${c.audience}`)}</TableCell>
                      <TableCell className="text-right">{formatNumber(emailCount)}</TableCell>
                      <TableCell>{formatDateTime(c.sentAt)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
