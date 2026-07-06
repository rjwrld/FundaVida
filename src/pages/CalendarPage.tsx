import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { RoleCalendar } from '@/components/shared/RoleCalendar'
import { SkeletonTable } from '@/components/shared/skeletons/SkeletonTable'
import { useStore } from '@/data/store'
import { useCourses } from '@/hooks/api'

/**
 * The role-scoped calendar, available to every role (ADR-0013). Its Sessions are
 * derived from the viewer's scoped Courses — a Student's enrolled Courses, a
 * Teacher's taught Courses, all Courses for an admin. It rides the same Courses
 * scope every other page gets from a hook (useCourses → coursesApi → the scope
 * seam), rather than importing applyScope/scopeFor and re-implementing the
 * plumbing — no calendar-specific permission (ADR-0033, ADR-0013). Teachers and
 * admins can follow an entry into its Course (e.g. to mark attendance); a
 * Student's entries are read-only.
 */
export function CalendarPage() {
  const { t } = useTranslation()
  const role = useStore((s) => s.role)
  const { data: scopedCourses = [], isLoading } = useCourses()

  if (!role) return null

  // Teachers and admins act on Sessions (mark attendance); students view only.
  const linkSessions = role === 'admin' || role === 'teacher'

  return (
    <div className="space-y-6">
      <PageHeader title={t('calendar.title')} description={t('calendar.subtitle')} />
      {isLoading ? (
        <SkeletonTable />
      ) : (
        <RoleCalendar courses={scopedCourses} linkSessions={linkSessions} />
      )}
    </div>
  )
}
