import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { WorklistCard, WorklistRow } from '@/components/shared/WorklistCard'
import { SkeletonCard } from '@/components/shared/skeletons/SkeletonCard'
import { atRiskStudents, type AtRiskReason } from '@/lib/dashboard'
import { fullName } from '@/lib/personName'
import { resolveQueries } from '@/lib/resolveQueries'
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
 * queries, so admin sees every Sede, held behind {@link resolveQueries} so an
 * unresolved read never flashes the all-clear (ADR-0030). Shows the first
 * {@link LIMIT}, links each to their profile, and links onward to the roster.
 */
export function AtRiskStudents() {
  const { t } = useTranslation()
  const studentsQuery = useStudents()
  const gradesQuery = useGrades()
  const attendanceQuery = useAttendance()
  const gate = resolveQueries([studentsQuery, gradesQuery, attendanceQuery])

  // Memoized over the reads' (structurally shared) data, so a re-render with
  // unchanged reads does not re-join every student's grades and attendance.
  const students = studentsQuery.data
  const grades = gradesQuery.data
  const attendance = attendanceQuery.data
  const atRisk = useMemo(
    () => (students && grades && attendance ? atRiskStudents(students, grades, attendance) : null),
    [students, grades, attendance]
  )
  if (gate.isPending || !atRisk) return <SkeletonCard lines={3} />

  const shown = atRisk.slice(0, LIMIT)

  return (
    <WorklistCard
      title={t('dashboard.atRisk.title')}
      icon={AlertTriangle}
      count={atRisk.length}
      emptyLabel={t('dashboard.atRisk.empty')}
      viewAll={{ to: '/app/students', label: t('dashboard.atRisk.viewAll') }}
    >
      {shown.map(({ student, reasons }) => (
        <WorklistRow
          key={student.id}
          to={`/app/students/${student.id}`}
          title={fullName(student)}
          trailing={reasons.map((reason) => (
            <Badge key={reason} variant="destructive">
              {t(REASON_KEY[reason])}
            </Badge>
          ))}
        />
      ))}
    </WorklistCard>
  )
}
