import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import type { DaySession } from '@/hooks/useDaySessions'

export interface SessionListProps {
  /** The selected day's Sessions, each tagged with its Course name. */
  sessions: DaySession[]
  /** When true, each entry links into its Course's attendance (Teacher/admin); otherwise read-only (Student) — ADR-0012/0013. */
  linkSessions: boolean
}

/**
 * The selected-day Session entries (Course name + ordinal). Teachers/admins follow
 * an entry into its Course's attendance; a Student's entries are read-only. Empty
 * days show the empty-day copy. Shared by RoleCalendar and DashboardCalendar.
 */
export function SessionList({ sessions, linkSessions }: SessionListProps) {
  const { t } = useTranslation()

  if (sessions.length === 0) {
    return <p className="mt-3 text-sm text-muted-foreground">{t('calendar.emptyDay')}</p>
  }

  return (
    <ul className="mt-3 space-y-1.5">
      {sessions.map((s) => {
        const label = t('calendar.sessionEntry', {
          course: s.courseName,
          ordinal: String(s.ordinal),
        } as Record<string, string>)
        return (
          <li key={`${s.courseId}-${s.date}`} className="text-sm">
            {linkSessions ? (
              <Link
                to={`/app/attendance?courseId=${s.courseId}`}
                className="text-foreground hover:text-brand-green-700 hover:underline"
              >
                {label}
              </Link>
            ) : (
              <span className="text-foreground">{label}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
