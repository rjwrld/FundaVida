import { useMemo, useState } from 'react'
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
import { EmailPreviewDialog } from '@/components/email/EmailPreviewDialog'
import { emailFilterLabel, sentRecipientCount } from '@/lib/emailRecipients'
import { useEmailCampaigns } from '@/hooks/api'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'

export function BulkEmailPage() {
  const { t } = useTranslation()
  const { formatDateTime, formatNumber } = useFormat()
  const students = useStore((s) => s.students)
  const programs = useStore((s) => s.programs)
  const courses = useStore((s) => s.courses)
  const { data: history = [] } = useEmailCampaigns()
  const [openedId, setOpenedId] = useState<string | null>(null)

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])

  const rows = useMemo(
    () =>
      history.map((campaign) => ({
        campaign,
        emailCount: sentRecipientCount(campaign, studentById),
      })),
    [history, studentById]
  )

  const opened = rows.find((row) => row.campaign.id === openedId)

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
          {rows.length === 0 ? (
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
                {rows.map(({ campaign, emailCount }) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      {/* The subject opens the sent artifact (ADR-0045). No new
                          route and no new permission — it rides `bulkEmail` view. */}
                      <button
                        type="button"
                        onClick={() => setOpenedId(campaign.id)}
                        className="text-left font-medium underline-offset-4 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        {campaign.subject}
                      </button>
                    </TableCell>
                    <TableCell>
                      {emailFilterLabel(campaign.filter, { programs, courses }, t)}
                    </TableCell>
                    <TableCell>{t(`bulkEmail.audience.${campaign.audience}`)}</TableCell>
                    <TableCell className="text-right">{formatNumber(emailCount)}</TableCell>
                    <TableCell>{formatDateTime(campaign.sentAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {opened && (
        <EmailPreviewDialog
          open
          onOpenChange={(next) => !next && setOpenedId(null)}
          subject={opened.campaign.subject}
          body={opened.campaign.body}
          filter={opened.campaign.filter}
          audience={opened.campaign.audience}
          recipientCount={opened.emailCount}
          sender={opened.campaign.sentBy}
          sentAt={opened.campaign.sentAt}
        />
      )}
    </div>
  )
}
