import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { CelebrationSweep } from '@/components/shared/CelebrationSweep'
import { LogoMark } from '@/components/brand/LogoMark'
import { CERTIFICATE_COLORS as C } from '@/lib/pdf/certificateTheme'
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
      {/* Miniature of the certificate itself (#367): the shared print-fixed
          palette and field order of CertificateTemplate / CertificatePreview, so
          the gallery previews what actually downloads. Paper stays white in dark
          mode — the certificate is a print artifact, not a themed surface — and
          the copy stays English to match the artifact (the CertificatePreview
          precedent). The Card's aria-label already narrates student + course,
          and the date/grade footer below is live text, so the miniature is
          decoration to assistive tech. */}
      <div
        aria-hidden="true"
        className="relative m-3 mb-0 flex aspect-11/8.5 flex-col items-center justify-center gap-1.5 border-2 px-4 py-3 text-center"
        style={{ backgroundColor: C.paper, borderColor: C.navy }}
      >
        <div
          className={cn('transition-transform duration-300', clickable && 'group-hover:scale-110')}
          style={{ color: C.navy }}
        >
          <LogoMark variant="mark" size="xs" alt="" />
        </div>
        <p className="text-[9px] tracking-[0.18em]" style={{ color: C.muted }}>
          CERTIFICATE OF COMPLETION
        </p>
        <p
          className="line-clamp-1 w-full text-base font-bold leading-tight"
          style={{ color: C.navy }}
        >
          {cert.studentName}
        </p>
        <p className="line-clamp-2 w-full text-[11px] leading-snug" style={{ color: C.slate }}>
          {cert.courseName}
        </p>
      </div>
      <CardContent className="flex flex-1 items-center justify-between gap-2 p-4 pt-3">
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {cert.issuedAt}
        </span>
        <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
          {cert.grade}
        </span>
      </CardContent>
    </Card>
  )
}
