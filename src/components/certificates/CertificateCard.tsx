import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  cert: {
    id: string
    studentName: string
    courseName: string
    issuedAt: string
    status: 'issued' | 'pending'
  }
  onClick: () => void
  className?: string
}

export function CertificateCard({ cert, onClick, className }: Props) {
  const { t } = useTranslation()
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label={t('certificates.list.cardAria', {
        student: cert.studentName,
        course: cert.courseName,
      })}
      className={cn(
        'group relative cursor-pointer overflow-hidden border-border/70 shadow-card transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-brand-green-200 hover:shadow-elevated',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-brand-green-50 via-card to-card">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(var(--brand-green-100)/0.6),transparent_55%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-6 top-6 h-px bg-gradient-to-r from-transparent via-brand-green-300/60 to-transparent"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-6 bottom-6 h-px bg-gradient-to-r from-transparent via-brand-green-300/60 to-transparent"
        />
        <span
          aria-hidden="true"
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-flame-yellow-100 ring-2 ring-flame-yellow-300/60"
        >
          <span className="h-2 w-2 rounded-full bg-flame-yellow-500" />
        </span>
        <FileText
          size={48}
          className="relative text-brand-green-500 transition-transform duration-300 group-hover:scale-105"
          aria-hidden="true"
        />
      </div>
      <CardContent className="p-4 pt-4">
        <p className="truncate text-sm font-semibold text-foreground">{cert.studentName}</p>
        <p className="truncate text-xs text-muted-foreground">{cert.courseName}</p>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {cert.issuedAt}
          </span>
          <Badge variant={cert.status === 'issued' ? 'success' : 'warning'} dot>
            {t(`certificates.status.${cert.status}`)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
