import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { clock } from '@/lib/clock'
import { upcomingSessions } from '@/lib/sessions'
import type { Course } from '@/types'

export interface NextSessionsListProps {
  courses: Course[]
  limit?: number
}

/**
 * Renders a list of the teacher's upcoming sessions with links to mark attendance.
 * Replaces the binary 1/0 "next session" counter.
 */
export function NextSessionsList({ courses, limit = 5 }: NextSessionsListProps) {
  const { t } = useTranslation()
  const sessions = upcomingSessions(courses, clock.today(), limit)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle as="h3" className="flex items-center gap-2">
          <Clock className="size-4 text-primary" aria-hidden="true" />
          {t('dashboard.teacher.nextSessions')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('dashboard.teacher.noUpcomingSessions')}
          </p>
        ) : (
          <ul className="flex flex-1 flex-col divide-y divide-border/60">
            {sessions.map((session) => (
              <li
                key={`${session.courseId}-${session.date}`}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{session.courseName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('calendar.sessionEntry', {
                      ordinal: String(session.ordinal),
                      course: session.courseName,
                    } as Record<string, string>)}
                  </p>
                </div>
                <Button asChild size="sm">
                  <Link to={`/app/courses/${session.courseId}/sessions/${session.date}/mark`}>
                    {t('dashboard.teacher.markAttendance')}
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
