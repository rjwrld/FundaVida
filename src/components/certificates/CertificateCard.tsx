import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CelebrationSweep } from '@/components/shared/CelebrationSweep'
import { cn } from '@/lib/utils'

interface Props {
  cert: {
    id: string
    studentName: string
    courseName: string
    issuedAt: string
    grade: string
  }
  /** Open the PDF preview. A Certificate exists iff its PDF is available (ADR-0024). */
  onOpen?: () => void
  /**
   * Plays the one-shot issuance shimmer (ADR-0047 phase 6b). The caller owns
   * the "just issued" verdict — only certificates that appeared after mount
   * qualify, never a page (re)load showing existing ones.
   */
  justIssued?: boolean
  className?: string
}

export function CertificateCard({ cert, onOpen, justIssued = false, className }: Props) {
  const { t } = useTranslation()
  const clickable = Boolean(onOpen)

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
          'cursor-pointer hover:border-foreground/30 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      {justIssued && <CelebrationSweep delay={0.3} className="z-10" />}
      <div className="relative flex aspect-4/3 items-center justify-center overflow-hidden bg-card">
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-2 ring-border"
        >
          <span className="h-2 w-2 rounded-full bg-foreground" />
        </span>
        <FileText
          size={48}
          className={cn(
            'relative text-primary transition-transform duration-300',
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
          <Badge variant="success">{t('certificates.status.issued')}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
