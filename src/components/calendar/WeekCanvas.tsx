import { addWeeks, format, isSameDay, subWeeks } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFormat } from '@/hooks/useFormat'
import { clock } from '@/lib/clock'
import { cn } from '@/lib/utils'
import { weekAgendaDays } from '@/lib/weekAgenda'
import { SessionCard, type SessionCardStatus } from './SessionCard'
import type { Course } from '@/types'

export type CalendarViewMode = 'week' | 'month'

export interface WeekCanvasProps {
  /** Already-scoped Courses (ADR-0008/0012); their derived Sessions fill the columns. */
  courses: Course[]
  /** Any day within the week to render; the canvas normalizes to that week's Monday. */
  weekOf: Date
  onWeekChange: (date: Date) => void
  /** Teacher/admin cards deep-link to Mark Attendance; student/tcu cards are read-only. */
  linkToMark: boolean
  /** Per-card status — the caller derives this from its own scoped attendance (student's own status, or the teacher/admin needs-marking rule). */
  statusFor: (courseId: string, date: string) => SessionCardStatus
}

/**
 * The week agenda canvas (ADR-0038): 7 Mon→Sun day-columns, each a top-to-bottom
 * stack of `SessionCard`s. Below `lg` the columns collapse into a single
 * vertical, day-grouped stack via the same markup (grid → flex at the `lg`
 * breakpoint), so there is one render path, not two.
 */
export function WeekCanvas({
  courses,
  weekOf,
  onWeekChange,
  linkToMark,
  statusFor,
}: WeekCanvasProps) {
  const { t } = useTranslation()
  const { locale } = useFormat()
  const dfLocale = locale === 'es' ? es : enUS

  const days = weekAgendaDays(courses, weekOf)
  const isEmptyWeek = days.every((day) => day.sessions.length === 0)
  const today = clock.today()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => onWeekChange(today)}>
            {t('calendar.today')}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('calendar.previous')}
            onClick={() => onWeekChange(subWeeks(weekOf, 1))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t('calendar.next')}
            onClick={() => onWeekChange(addWeeks(weekOf, 1))}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {isEmptyWeek ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
          {t('calendar.emptyWeek')}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
          {days.map((day) => {
            const isToday = isSameDay(day.date, today)
            return (
              <div
                key={day.date.toISOString()}
                data-today={isToday ? 'true' : undefined}
                className={cn(
                  'flex flex-col gap-2 rounded-lg p-2',
                  isToday && 'bg-brand-green-50 dark:bg-brand-green-950/20'
                )}
              >
                <div className="flex items-baseline justify-between px-1">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {format(day.date, 'EEEE', { locale: dfLocale })}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm tabular-nums',
                      isToday ? 'font-semibold text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {format(day.date, 'd')}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {day.sessions.map((session) => (
                    <SessionCard
                      key={`${session.courseId}-${session.date}`}
                      course={session.course}
                      session={session}
                      status={statusFor(session.courseId, session.date)}
                      linkToMark={linkToMark}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
