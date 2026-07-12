import { useEffect, useRef } from 'react'
import { addWeeks, format, isSameDay, parseISO, startOfDay, subWeeks } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import type { Locale } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useFormat } from '@/hooks/useFormat'
import { calendarCardName } from '@/lib/courseName'
import { clock } from '@/lib/clock'
import { cn } from '@/lib/utils'
import {
  nearestSessionsAround,
  startOfWeekMonday,
  visibleWorkweekDays,
  weekAgendaDays,
  type NearestSession,
} from '@/lib/weekAgenda'
import { SessionCard, type SessionCardStatus, type SessionCardTime } from './SessionCard'
import type { Course, SessionException } from '@/types'

export type CalendarViewMode = 'week' | 'month'

export interface WeekCanvasProps {
  /** Already-scoped Courses (ADR-0008/0012); their derived Sessions fill the columns. */
  courses: Course[]
  /** The Session exceptions overlay (ADR-0039), applied by `weekAgendaDays`. Omit for none. */
  sessionExceptions?: SessionException[]
  /** Any day within the week to render; the canvas normalizes to that week's Monday. */
  weekOf: Date
  onWeekChange: (date: Date) => void
  /** Teacher/admin cards deep-link to Mark Attendance; student/tcu cards are read-only. */
  linkToMark: boolean
  /** Per-card status — the caller derives this from its own scoped attendance (student's own status, or the teacher/admin needs-marking rule). */
  statusFor: (courseId: string, date: string) => SessionCardStatus
}

/** Time depth of a day-column relative to today (ADR-0044). */
function dayTime(date: Date, today: Date): SessionCardTime {
  if (isSameDay(date, today)) return 'today'
  return startOfDay(date) < startOfDay(today) ? 'past' : 'future'
}

/**
 * The workweek canvas (ADR-0044): Monday–Friday columns always, plus a weekend
 * column only when it carries a Session. One render path — a horizontal
 * snap-scroll of ~75vw panels under `md` (opened centered on today, the next day
 * peeking) that becomes a full-width column grid at `md+`. Time gets depth
 * without new color: past columns mute, today's column tints, the future sits
 * quiet. An empty week points at the nearest Session in each direction rather
 * than dead-ending.
 */
export function WeekCanvas({
  courses,
  sessionExceptions = [],
  weekOf,
  onWeekChange,
  linkToMark,
  statusFor,
}: WeekCanvasProps) {
  const { t } = useTranslation()
  const { locale } = useFormat()
  const dfLocale = locale === 'es' ? es : enUS

  const today = clock.today()
  const weekStart = startOfWeekMonday(weekOf)
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
  const days = visibleWorkweekDays(weekAgendaDays(courses, weekOf, sessionExceptions))
  const isEmptyWeek = days.every((day) => day.sessions.length === 0)

  // Mobile: open the snap-scroll canvas centered on today's column (the next day
  // peeks as the scroll affordance). Only touches the scroll container's own
  // scrollLeft, so it is a no-op on the `md+` grid and never moves the page.
  const scrollRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = scrollRef.current
    const col = todayRef.current
    if (!container || !col) return
    container.scrollLeft = col.offsetLeft - (container.clientWidth - col.clientWidth) / 2
  }, [weekOf])

  return (
    <div className="space-y-4">
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

      {isEmptyWeek ? (
        <EmptyWeek
          courses={courses}
          weekStart={weekStart}
          weekEnd={weekEnd}
          exceptions={sessionExceptions}
          onWeekChange={onWeekChange}
          dfLocale={dfLocale}
        />
      ) : (
        <div
          ref={scrollRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:snap-none md:overflow-visible md:pb-0"
          style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {days.map((day) => {
            const time = dayTime(day.date, today)
            const isToday = time === 'today'
            return (
              <div
                key={day.date.toISOString()}
                ref={isToday ? todayRef : undefined}
                data-today={isToday ? 'true' : undefined}
                className={cn(
                  'flex shrink-0 basis-[75vw] snap-center flex-col gap-2 rounded-lg p-2 md:basis-auto',
                  isToday && 'bg-primary/5'
                )}
              >
                <div className="flex items-baseline justify-between px-1">
                  <span
                    className={cn(
                      'text-xs font-medium uppercase tracking-wide',
                      isToday ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {format(day.date, 'EEE', { locale: dfLocale })}
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
                      total={session.total}
                      status={statusFor(session.courseId, session.date)}
                      linkToMark={linkToMark}
                      time={time}
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

/**
 * The empty-week quiet state (ADR-0044): names the nearest Session in each
 * direction and offers a jump to its week. Never a dead end — every jump target
 * is real seeded data already on the page.
 */
function EmptyWeek({
  courses,
  weekStart,
  weekEnd,
  exceptions,
  onWeekChange,
  dfLocale,
}: {
  courses: Course[]
  weekStart: Date
  weekEnd: Date
  exceptions: SessionException[]
  onWeekChange: (date: Date) => void
  dfLocale: Locale
}) {
  const { t } = useTranslation()
  const { prev, next } = nearestSessionsAround(courses, weekStart, weekEnd, exceptions)

  const label = (nearest: NearestSession) => {
    const course = courses.find((c) => c.id === nearest.courseId)
    const name = course ? calendarCardName(course) : nearest.courseName
    return `${name} · ${format(parseISO(nearest.date), 'EEE MMM d', { locale: dfLocale })}`
  }

  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-card/50 px-5 py-10 text-center">
      <p className="text-sm text-muted-foreground">{t('calendar.emptyWeek')}</p>
      <div className="mt-4 flex flex-col items-center gap-3">
        {next ? (
          <NearestJump
            label={t('calendar.emptyWeekNext', { session: label(next) })}
            onJump={() => onWeekChange(parseISO(next.date))}
          />
        ) : null}
        {prev ? (
          <NearestJump
            label={t('calendar.emptyWeekPrev', { session: label(prev) })}
            onJump={() => onWeekChange(parseISO(prev.date))}
          />
        ) : null}
      </div>
    </div>
  )
}

function NearestJump({ label, onJump }: { label: string; onJump: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-1">
      <p className="text-sm text-foreground">{label}</p>
      <Button variant="ghost" size="sm" onClick={onJump} className="text-primary">
        {t('calendar.jumpToWeek')}
        <ArrowRight className="ml-1 size-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
