import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { atRiskStudents, type AtRiskReason } from '@/lib/dashboard'
import { fullName } from '@/lib/personName'
import { useStudents } from '@/hooks/api/students'
import { useGrades } from '@/hooks/api/grades'
import { useAttendance } from '@/hooks/api/attendance'

const LIMIT = 5

const REASON_KEY: Record<AtRiskReason, string> = {
  failing: 'dashboard.atRisk.reasonFailing',
  lowAttendance: 'dashboard.atRisk.reasonLowAttendance',
}

/**
 * Students needing attention — a failing Grade or low attendance (see
 * {@link atRiskStudents}). Reads the role-scoped students / grades / attendance
 * queries, so admin sees every Sede. Shows the first {@link LIMIT}, links each to
 * their profile, and links onward to the full roster.
 */
export function AtRiskStudents() {
  const { t } = useTranslation()
  const { data: students = [] } = useStudents()
  const { data: grades = [] } = useGrades()
  const { data: attendance = [] } = useAttendance()

  const atRisk = useMemo(
    () => atRiskStudents(students, grades, attendance),
    [students, grades, attendance]
  )
  const shown = atRisk.slice(0, LIMIT)
  const overflow = atRisk.length - shown.length

  return (
    <article className="flex h-full flex-col rounded-lg border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">{t('dashboard.atRisk.title')}</h3>
        <AlertTriangle className="size-4 shrink-0 text-flame-red-500" aria-hidden="true" />
      </header>
      {atRisk.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('dashboard.atRisk.empty')}</p>
      ) : (
        <>
          <ul className="flex flex-1 flex-col divide-y divide-border/60">
            {shown.map(({ student, reasons }) => (
              <li key={student.id} className="py-2 first:pt-0 last:pb-0">
                <Link
                  to={`/app/students/${student.id}`}
                  className="group flex items-center justify-between gap-3 rounded-md py-1"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:text-brand-green-700 dark:group-hover:text-brand-green-300 group-hover:underline">
                    {fullName(student)}
                  </span>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    {reasons.map((reason) => (
                      <Badge key={reason} variant="destructive">
                        {t(REASON_KEY[reason])}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {overflow > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t('dashboard.atRisk.more', { count: overflow })}
            </p>
          )}
        </>
      )}
      <Link
        to="/app/students"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-green-700 dark:text-brand-green-300 hover:underline"
      >
        {t('dashboard.atRisk.viewAll')}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  )
}
