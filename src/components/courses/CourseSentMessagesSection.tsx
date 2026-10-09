import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { EmailPreviewDialog } from '@/components/email/EmailPreviewDialog'
import { sentRecipientCount } from '@/lib/emailRecipients'
import { resolveQueries } from '@/lib/resolveQueries'
import { useCourseCampaigns, useStudents } from '@/hooks/api'
import { useFormat } from '@/hooks/useFormat'
import type { Course, EmailCampaign, Student } from '@/types'
import { SectionHeader } from '@/components/shared/SectionHeader'

/** One row per sent campaign, its recipient count resolved against the viewer's students. */
function buildRows(campaigns: EmailCampaign[], students: Student[]) {
  const studentById = new Map(students.map((s) => [s.id, s]))
  return campaigns.map((campaign) => ({
    campaign,
    emailCount: sentRecipientCount(campaign, studentById),
  }))
}

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
  const [openedId, setOpenedId] = useState<string | null>(null)

  // Every row derives from BOTH queries — the campaign for its subject, the students
  // for its recipient count — so the card holds until both resolve (ADR-0030).
  // Reading the students query's default `[]` window would paint a row counting zero
  // recipients, then correct it.
  //
  // The rows come out of `gate.data`, which narrows to a tuple only once both have
  // loaded. Nothing here destructures a `[]` default, so widening this card's data
  // dependencies without widening the gate is a type error, not a flash.
  const gate = resolveQueries([campaignsQuery, studentsQuery])

  const rows = gate.isPending ? null : buildRows(...gate.data)

  const opened = rows?.find((row) => row.campaign.id === openedId)

  // A Course with nothing sent has no outbox to show (ADR-0051): the card waits
  // for its rows and stays away when there are none. "Message the class" in the
  // page header is the way to start one.
  if (rows === null || rows.length === 0) return null

  return (
    <Card role="region" aria-labelledby="course-sent-messages-heading" className="gap-2 py-4">
      <CardContent className="space-y-2 px-4">
        <SectionHeader
          id="course-sent-messages-heading"
          title={t('courses.detail.sentMessages.heading')}
          count={t('courses.detail.sentMessages.count', { count: rows.length })}
          compact
        />
        <ul className="divide-y divide-border/60">
          {rows.map(({ campaign, emailCount }) => (
            <li
              key={campaign.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1.5 text-sm"
            >
              {/* No filter column: every row targets this same Course, so the
                  label would be constant noise (ADR-0046). */}
              <button
                type="button"
                onClick={() => setOpenedId(campaign.id)}
                className="min-w-0 text-left font-medium underline underline-offset-4 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {campaign.subject}
              </button>
              <span className="text-muted-foreground">
                {t(`bulkEmail.audience.${campaign.audience}`)} ·{' '}
                <span data-testid="sent-message-recipients" className="tabular-nums">
                  {t('courses.detail.sentMessages.recipients', {
                    count: emailCount,
                    n: formatNumber(emailCount),
                  })}
                </span>{' '}
                · {formatDateTime(campaign.sentAt)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

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
    </Card>
  )
}
