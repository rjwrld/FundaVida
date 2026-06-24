import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { RoleCalendar } from '@/components/shared/RoleCalendar'
import { useStore } from '@/data/store'
import { scopeFor } from '@/permissions'
import { applyScope } from '@/data/api/scope'

/**
 * The role-scoped calendar, available to every role (ADR-0013). Its Sessions are
 * derived from the viewer's scoped Courses — a Student's enrolled Courses, a
 * Teacher's taught Courses, all Courses for an admin — riding the existing Courses
 * scope rather than a calendar-specific permission. Teachers and admins can follow
 * an entry into its Course (e.g. to mark attendance); a Student's entries are read-only.
 */
export function CalendarPage() {
  const { t } = useTranslation()
  const role = useStore((s) => s.role)
  const courses = useStore((s) => s.courses)

  const scopedCourses = useMemo(
    () => (role ? applyScope('courses', scopeFor(role).courses, courses) : []),
    [role, courses]
  )

  if (!role) return null

  // Teachers and admins act on Sessions (mark attendance); students view only.
  const linkSessions = role === 'admin' || role === 'teacher'

  return (
    <div className="space-y-6">
      <PageHeader title={t('calendar.title')} description={t('calendar.subtitle')} />
      <RoleCalendar courses={scopedCourses} linkSessions={linkSessions} />
    </div>
  )
}
