import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { CertificateStatus } from '@/types'

interface Props {
  cert: {
    id: string
    studentName: string
    courseName: string
    issuedAt: string
    grade: string
    status: CertificateStatus
  }
  /** Open the PDF preview — only wired for approved Certificates. */
  onOpen?: () => void
  /** Approve a pending Certificate — only wired for an admin. */
  onApprove?: () => void
  approving?: boolean
  /**
   * The Certificate's owner (a Student) viewing their own record. Shifts the
   * pending label to "in review" and surfaces a disabled download, so the
   * receiving side reads the workflow from its own perspective (issue #73).
   */
  recipientView?: boolean
  className?: string
}

export function CertificateCard({
  cert,
  onOpen,
  onApprove,
  approving,
  recipientView,
  className,
}: Props) {
  const { t } = useTranslation()
  const isApproved = cert.status === 'approved'
  const clickable = isApproved && Boolean(onOpen)
  const statusLabel =
    recipientView && !isApproved
      ? t('certificates.status.inReview')
      : t(`certificates.status.${cert.status}`)

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!clickable) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen?.()
    }
  }

  return (
    <Card
      {...(clickable
        ? {
            role: 'button',
            tabIndex: 0,
            onClick: onOpen,
            onKeyDown: handleKeyDown,
            'aria-label': t('certificates.list.cardAria', {
              student: cert.studentName,
              course: cert.courseName,
            }),
          }
        : {})}
      className={cn(
        'group relative flex flex-col overflow-hidden border-border/70 transition-colors',
        clickable &&
          'cursor-pointer hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-card">
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-2 ring-border"
        >
          <span className="h-2 w-2 rounded-full bg-foreground" />
        </span>
        <FileText
          size={48}
          className={cn(
            'relative text-brand-green-500 transition-transform duration-300',
            clickable && 'group-hover:scale-105'
          )}
          aria-hidden="true"
        />
      </div>
      <CardContent className="flex flex-1 flex-col p-4 pt-4">
        <p className="truncate text-sm font-semibold text-foreground">{cert.studentName}</p>
        <p className="truncate text-xs text-muted-foreground">{cert.courseName}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {cert.issuedAt}
            </span>
            <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
              {cert.grade}
            </span>
          </div>
          <Badge variant={isApproved ? 'success' : 'warning'} dot>
            {statusLabel}
          </Badge>
        </div>
        {!isApproved && onApprove && (
          <Button
            size="sm"
            className="mt-4 w-full"
            onClick={onApprove}
            disabled={approving}
            aria-label={t('certificates.list.approveAria', { student: cert.studentName })}
          >
            {t('certificates.list.approve')}
          </Button>
        )}
        {!isApproved && recipientView && (
          <Button size="sm" variant="outline" className="mt-4 w-full" disabled aria-disabled="true">
            {t('certificates.list.downloadPdf')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
