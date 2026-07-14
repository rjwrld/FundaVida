import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CelebrationSweep } from '@/components/shared/CelebrationSweep'
import { transitionGlide } from '@/lib/motion'
import type { CloseReadiness } from '@/lib/closeReadiness'

/**
 * Informational close-readiness checklist for a published, Term-ended Course
 * (issue #204): what still blocks a clean close, per {@link CloseReadiness}.
 * Purely presentational — the caller derives readiness and gates visibility,
 * and the close action is never disabled by it.
 *
 * `celebrate` plays the close cascade (ADR-0047 phase 6b): each row's icon
 * pops back in on a stagger behind a green sweep. The caller flips it on for
 * the moment the close lands and owns tearing the checklist down afterwards;
 * under reduced motion the cascade renders as the plain static list.
 */
export function CloseReadinessChecklist({
  readiness,
  celebrate = false,
}: {
  readiness: CloseReadiness
  celebrate?: boolean
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const cascade = celebrate && !reduce

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
        {checks.map((check, index) => {
          const delay = 0.15 + index * 0.25
          return (
            <li
              key={check.key}
              className="relative flex items-center gap-2 overflow-hidden rounded-md border bg-card px-3 py-2 text-sm text-foreground"
            >
              {cascade && <CelebrationSweep delay={delay} />}
              <motion.span
                // Remounting on the celebrate flip is what replays the pop.
                key={cascade ? 'cascade' : 'static'}
                className="flex shrink-0"
                initial={cascade ? { scale: 0.3, opacity: 0 } : false}
                animate={cascade ? { scale: 1, opacity: 1 } : undefined}
                transition={{ ...transitionGlide, delay }}
              >
                {check.pass ? (
                  <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-primary" />
                ) : (
                  <XCircle aria-hidden="true" className="size-4 shrink-0 text-destructive" />
                )}
              </motion.span>
              <span>{check.pass ? check.passLabel : check.failLabel}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
