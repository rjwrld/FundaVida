import { useTranslation } from 'react-i18next'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CloseReadiness } from '@/lib/closeReadiness'

/**
 * Informational close-readiness checklist for a published, Term-ended Course
 * (issue #204): what still blocks a clean close, per {@link CloseReadiness}.
 * Purely presentational — the caller derives readiness and gates visibility,
 * and the close action is never disabled by it.
 */
export function CloseReadinessChecklist({ readiness }: { readiness: CloseReadiness }) {
  const { t } = useTranslation()

  const checks = [
    {
      key: 'grades',
      pass: readiness.ungradedStudentIds.length === 0,
      passLabel: t('courses.detail.readiness.grades.pass'),
      failLabel: t('courses.detail.readiness.grades.fail', {
        count: readiness.ungradedStudentIds.length,
      }),
    },
    {
      key: 'attendance',
      pass: readiness.unrecordedSessions.length === 0,
      passLabel: t('courses.detail.readiness.attendance.pass'),
      failLabel: t('courses.detail.readiness.attendance.fail', {
        count: readiness.unrecordedSessions.length,
      }),
    },
  ]

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {t('courses.detail.readiness.title')}
        </h2>
        <Badge
          variant={readiness.ready ? 'success' : 'warning'}
          data-testid="close-readiness-verdict"
        >
          {readiness.ready
            ? t('courses.detail.readiness.verdict.ready')
            : t('courses.detail.readiness.verdict.blocked')}
        </Badge>
      </div>
      <ul className="space-y-2">
        {checks.map((check) => (
          <li
            key={check.key}
            className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm text-foreground"
          >
            {check.pass ? (
              <CheckCircle2
                aria-hidden="true"
                className="size-4 shrink-0 text-brand-green-700 dark:text-brand-green-300"
              />
            ) : (
              <XCircle aria-hidden="true" className="size-4 shrink-0 text-flame-red-500" />
            )}
            <span>{check.pass ? check.passLabel : check.failLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
