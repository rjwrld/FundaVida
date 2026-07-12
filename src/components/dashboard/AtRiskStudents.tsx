import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle as="h3">{t('dashboard.atRisk.title')}</CardTitle>
        <CardAction>
          <AlertTriangle className="size-4 text-destructive" aria-hidden="true" />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
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
                    <span className="min-w-0 truncate text-sm font-medium text-foreground group-hover:text-primary group-hover:underline">
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
      </CardContent>
      <CardFooter>
        <Link
          to="/app/students"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {t('dashboard.atRisk.viewAll')}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  )
}
