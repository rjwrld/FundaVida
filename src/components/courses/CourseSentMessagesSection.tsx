import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NoResults } from '@/components/shared/NoResults'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmailPreviewDialog } from '@/components/email/EmailPreviewDialog'
import { sentRecipientCount } from '@/lib/emailRecipients'
import { resolveQueries } from '@/lib/resolveQueries'
import { useCourseCampaigns, useStudents } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import type { Course } from '@/types'

/**
 * The Course's outbox (ADR-0046): the class messages sent to this cohort, newest
 * first, each opening as the rendered email it was (ADR-0045).
 *
 * Gated by the caller on `view bulkEmail` with the Course in context, so the
 * audience is the owning Teacher or an admin. The component never branches on
 * role — the scope seam already narrowed the list, so a teacher reads the messages
 * they sent and an admin reads every message aimed at the Course, the teacher's
 * included. There is no lifecycle guard: an outbox is worth reading after a cohort
 * closes, which is exactly where the seeded class message lives.
 */
export function CourseSentMessagesSection({ course }: { course: Course }) {
  const { t } = useTranslation()
  const { formatDateTime, formatNumber } = useFormat()
  const campaignsQuery = useCourseCampaigns(course.id)
  const studentsQuery = useStudents()
  const { data: campaigns = [] } = campaignsQuery
  const { data: students = [] } = studentsQuery
  const [openedId, setOpenedId] = useState<string | null>(null)

  // Every row derives from BOTH queries — the campaign for its subject, the
  // students for its recipient count — so the card holds until both resolve
  // (ADR-0030). Reading the students query's default `[]` window would paint a row
  // counting zero recipients, then correct it.
  const gate = resolveQueries([campaignsQuery, studentsQuery])

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s])), [students])

  const rows = useMemo(() => {
    if (gate.isPending) return null
    return campaigns.map((campaign) => ({
      campaign,
      emailCount: sentRecipientCount(campaign, studentById),
    }))
  }, [gate.isPending, campaigns, studentById])

  const opened = rows?.find((row) => row.campaign.id === openedId)

  return (
    <section aria-labelledby="course-sent-messages-heading" className="space-y-3">
      <h2 id="course-sent-messages-heading" className="text-lg font-semibold tracking-tight">
        {t('courses.detail.sentMessages.heading')}
      </h2>

      {rows === null ? (
        <p className="text-sm text-muted-foreground">{t('courses.detail.loading')}</p>
      ) : rows.length === 0 ? (
        <NoResults message={t('courses.detail.sentMessages.empty')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bulkEmail.history.columns.subject')}</TableHead>
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
                  {/* No filter column: every row targets this same Course, so the
                      label would be constant noise (ADR-0046). */}
                  <button
                    type="button"
                    onClick={() => setOpenedId(campaign.id)}
                    className="text-left font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    {campaign.subject}
                  </button>
                </TableCell>
                <TableCell>{t(`bulkEmail.audience.${campaign.audience}`)}</TableCell>
                <TableCell className="text-right" data-testid="sent-message-recipients">
                  {formatNumber(emailCount)}
                </TableCell>
                <TableCell>{formatDateTime(campaign.sentAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

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
    </section>
  )
}
