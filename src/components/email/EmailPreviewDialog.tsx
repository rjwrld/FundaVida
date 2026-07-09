import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { buildEmailHtml } from '@/lib/emailHtml'
import { campaignSenderLabel, emailFilterLabel } from '@/lib/emailRecipients'
import { useStore } from '@/data/store'
import { useFormat } from '@/hooks/useFormat'
import type { EmailAudience, EmailFilter } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (next: boolean) => void
  subject: string
  body: string
  filter: EmailFilter
  audience: EmailAudience
  /** Emails the campaign reaches, not Students (ADR-0041). */
  recipientCount: number
  /**
   * The campaign's raw `sentBy` — a user id or a sentinel, resolved to a name here.
   * Sent campaigns only: a composer draft has neither a sender nor a timestamp.
   */
  sender?: string
  sentAt?: string
}

/**
 * The sent artifact (ADR-0045): the campaign rendered as the self-contained,
 * light-themed HTML email it is, inside a scripts-off sandboxed iframe. The
 * document knows nothing about the campaign's routing, so the dialog frames it
 * with that chrome — sender, filter, audience, recipient count, sentAt.
 *
 * One component, two mounts: the history row shows a sent campaign, the composer's
 * Preview button shows the current draft, and both go through `buildEmailHtml`, so
 * a preview cannot drift from what the history will render.
 */
export function EmailPreviewDialog({
  open,
  onOpenChange,
  subject,
  body,
  filter,
  audience,
  recipientCount,
  sender,
  sentAt,
}: Props) {
  const { t, i18n } = useTranslation()
  const { formatDateTime, formatNumber } = useFormat()
  const programs = useStore((s) => s.programs)
  const courses = useStore((s) => s.courses)
  const teachers = useStore((s) => s.teachers)

  const html = useMemo(
    () =>
      buildEmailHtml({
        subject,
        body,
        lang: i18n.language,
        disclaimer: t('bulkEmail.preview.disclaimer'),
      }),
    [subject, body, i18n.language, t]
  )

  const chrome: { label: string; value: string }[] = [
    ...(sender
      ? [
          {
            label: t('bulkEmail.preview.sender'),
            value: campaignSenderLabel(sender, { teachers }, t),
          },
        ]
      : []),
    {
      label: t('bulkEmail.history.columns.filter'),
      value: emailFilterLabel(filter, { programs, courses }, t),
    },
    { label: t('bulkEmail.history.columns.audience'), value: t(`bulkEmail.audience.${audience}`) },
    {
      label: t('bulkEmail.history.columns.recipients'),
      value: formatNumber(recipientCount),
    },
    ...(sentAt
      ? [{ label: t('bulkEmail.history.columns.sentAt'), value: formatDateTime(sentAt) }]
      : []),
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('bulkEmail.preview.title')}</DialogTitle>
          <DialogDescription>{t('bulkEmail.preview.description')}</DialogDescription>
        </DialogHeader>

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {chrome.map((row) => (
            <div key={row.label} className="flex gap-2">
              <dt className="text-muted-foreground">{row.label}:</dt>
              <dd className="min-w-0 truncate font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {/* `sandbox=""` withholds every capability: no scripts, no same-origin, no
            forms. The document is inert by construction (every field is escaped),
            and the sandbox is the belt to that suspenders.

            `bg-white` is deliberately a raw colour, not a theme token (DESIGN.md):
            this frame belongs to the light-only artifact, not to the app chrome, and
            it is what the reader sees before the document paints. A themed token
            would flash the app's dark canvas behind a light email. */}
        <iframe
          title={t('bulkEmail.preview.frameTitle')}
          sandbox=""
          srcDoc={html}
          className="h-[26rem] w-full rounded-md border bg-white"
        />
      </DialogContent>
    </Dialog>
  )
}
