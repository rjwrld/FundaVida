import { useMemo, useState } from 'react'
import { isSameDay } from 'date-fns'
import { clock } from '@/lib/clock'
import { sessionsFor, type Session } from '@/lib/sessions'
import type { Course } from '@/types'

export interface DaySession extends Session {
  courseName: string
}

export interface UseDaySessions {
  /** The currently selected day; defaults to today. */
  selected: Date
  setSelected: (date: Date) => void
  /** One Date per Session day, to mark events on the calendar. */
  events: Date[]
  /** The Sessions falling on the selected day, each tagged with its Course name. */
  daySessions: DaySession[]
}

/**
 * Derive a viewer's Sessions from their already-scoped Courses (ADR-0013, ADR-0001)
 * and track a selected day. Backs CalendarPage's month mode (ADR-0038) — its
 * former consumers, RoleCalendar and DashboardCalendar, were superseded by the
 * week agenda and the dashboard AgendaSlice, which bucket via lib/weekAgenda
 * and lib/agenda instead.
 */
export function useDaySessions(courses: Course[]): UseDaySessions {
  const [selected, setSelected] = useState<Date>(() => clock.today())

  const sessions = useMemo<DaySession[]>(
    () => courses.flatMap((c) => sessionsFor(c).map((s) => ({ ...s, courseName: c.name }))),
    [courses]
  )

  const events = useMemo(() => sessions.map((s) => new Date(s.date)), [sessions])

  const daySessions = useMemo(
    () => sessions.filter((s) => isSameDay(new Date(s.date), selected)),
    [sessions, selected]
  )

  return { selected, setSelected, events, daySessions }
}
