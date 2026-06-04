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
    grade: string
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
        'group relative cursor-pointer overflow-hidden border-border/70 transition-colors hover:border-foreground/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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
          className="relative text-brand-green-500 transition-transform duration-300 group-hover:scale-105"
          aria-hidden="true"
        />
      </div>
      <CardContent className="p-4 pt-4">
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
          <Badge variant={cert.status === 'issued' ? 'success' : 'warning'} dot>
            {t(`certificates.status.${cert.status}`)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
