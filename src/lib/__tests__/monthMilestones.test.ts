import { describe, it, expect } from 'vitest'
import {
  milestonesFor,
  milestonesInMonth,
  nearestMilestonesAround,
  type Milestone,
} from '@/lib/monthMilestones'
import type { Course, SessionException, Weekday } from '@/types'

function isoDay(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toISOString()
}

/** Meets Mon/Wed, June 1 (Mon) → June 24 (Wed), 2026. */
const courseA: Course = {
  id: 'cou-A',
  name: 'Inglés Primaria — Linda Vista (jun 2026)',
  description: '',
  sede: 'Linda Vista',
  programId: 'prog-1',
  level: 'primaria',
  status: 'published',
  capacity: 20,
  teacherId: 'tea-1',
  term: { start: isoDay(2026, 5, 1), end: isoDay(2026, 5, 24) },
  meetingDays: ['mon', 'wed'] as Weekday[],
  createdAt: isoDay(2026, 4, 1),
}

/** Meets Tue/Thu, July 7 → July 30, 2026 — a different month entirely. */
const courseB: Course = {
  ...courseA,
  id: 'cou-B',
  name: 'Historia Secundaria — Guararí (jul 2026)',
  term: { start: isoDay(2026, 6, 7), end: isoDay(2026, 6, 30) },
  meetingDays: ['tue', 'thu'] as Weekday[],
}

const kinds = (milestones: Milestone[]) => milestones.map((m) => m.kind)
const days = (milestones: Milestone[]) =>
  milestones.map((m) => new Date(m.date).getDate().toString())

/** The day-of-month a milestone lands on — `null` when there is no milestone at all. */
const dayOf = (milestone: Milestone | null | undefined) =>
  milestone ? new Date(milestone.date).getDate() : null
const monthOf = (milestone: Milestone | null | undefined) =>
  milestone ? new Date(milestone.date).getMonth() : null

describe('milestonesFor — the month term map (ADR-0048)', () => {
  it('derives a cohort start and end from each Course term', () => {
    const found = milestonesFor([courseA], [])

    expect(kinds(found)).toEqual(['cohortStart', 'cohortEnd'])
    expect(days(found)).toEqual(['1', '24'])
    // The row copy keeps the Sede (the list shows no Sede of its own) and drops
    // the cohort period — ADR-0021's collision trap.
    expect(found[0]).toMatchObject({
      courseId: 'cou-A',
      courseName: 'Inglés Primaria — Linda Vista',
    })
  })

  it('carries a cancelled Session with its note', () => {
    const cancelled: SessionException = {
      id: 'sxc-1',
      courseId: 'cou-A',
      type: 'cancelled',
      date: isoDay(2026, 5, 10), // a Wednesday inside the term
      note: 'Feriado',
      createdAt: isoDay(2026, 4, 1),
    }

    const found = milestonesFor([courseA], [cancelled])

    const cancel = found.find((m) => m.kind === 'cancelled')
    expect(dayOf(cancel)).toBe(10)
    expect(cancel).toMatchObject({ courseId: 'cou-A', note: 'Feriado' })
  })

  it('marks BOTH the vacated day and the target day of a reschedule', () => {
    const moved: SessionException = {
      id: 'sxc-2',
      courseId: 'cou-A',
      type: 'rescheduled',
      date: isoDay(2026, 5, 10), // Wed, a base Session
      newDate: isoDay(2026, 5, 12), // Fri, a day the cohort never meets
      note: 'Aula no disponible',
      createdAt: isoDay(2026, 4, 1),
    }

    const found = milestonesFor([courseA], [moved])

    const from = found.find((m) => m.kind === 'rescheduledFrom')
    const to = found.find((m) => m.kind === 'rescheduledTo')
    expect(dayOf(from)).toBe(10)
    expect(dayOf(to)).toBe(12)
    expect(to).toMatchObject({ note: 'Aula no disponible' })
  })

  it('sorts chronologically, and stacks same-day milestones by glyph priority', () => {
    // A cancellation lands on cou-A's very first day — the same day as its start.
    const sameDay: SessionException = {
      id: 'sxc-3',
      courseId: 'cou-A',
      type: 'cancelled',
      date: isoDay(2026, 5, 1),
      createdAt: isoDay(2026, 4, 1),
    }

    const found = milestonesFor([courseA, courseB], [sameDay])

    // Boundaries outrank exceptions on a shared day (the ADR's vocabulary order),
    // and the whole list is ascending by day across Courses.
    expect(kinds(found)).toEqual([
      'cohortStart', // A, Jun 1
      'cancelled', // A, Jun 1
      'cohortEnd', // A, Jun 24
      'cohortStart', // B, Jul 7
      'cohortEnd', // B, Jul 30
    ])
  })

  it('ignores exceptions of Courses outside the scoped list', () => {
    const foreign: SessionException = {
      id: 'sxc-4',
      courseId: 'cou-B',
      type: 'cancelled',
      date: isoDay(2026, 6, 7),
      createdAt: isoDay(2026, 4, 1),
    }

    const found = milestonesFor([courseA], [foreign])

    expect(kinds(found)).toEqual(['cohortStart', 'cohortEnd'])
  })

  it('narrates nothing for an exception that names no base Session', () => {
    // Jun 9 is a Tuesday — cou-A never meets then, so `effectiveSessions` treats
    // this as a no-op. A glyph here would claim a Session that never existed.
    const phantom: SessionException = {
      id: 'sxc-5',
      courseId: 'cou-A',
      type: 'cancelled',
      date: isoDay(2026, 5, 9),
      createdAt: isoDay(2026, 4, 1),
    }

    const found = milestonesFor([courseA], [phantom])

    expect(kinds(found)).toEqual(['cohortStart', 'cohortEnd'])
  })

  it('narrates nothing for a reschedule with no target', () => {
    const noTarget: SessionException = {
      id: 'sxc-6',
      courseId: 'cou-A',
      type: 'rescheduled',
      date: isoDay(2026, 5, 10),
      createdAt: isoDay(2026, 4, 1),
    }

    const found = milestonesFor([courseA], [noTarget])

    // `effectiveSessions` leaves the Session where it is, so neither day moved.
    expect(kinds(found)).toEqual(['cohortStart', 'cohortEnd'])
  })

  it('derives nothing from an inverted or malformed term', () => {
    const inverted: Course = {
      ...courseA,
      id: 'cou-X',
      term: { start: isoDay(2026, 5, 24), end: isoDay(2026, 5, 1) },
    }
    const malformed: Course = { ...courseA, id: 'cou-Y', term: { start: 'nope', end: 'nope' } }

    expect(milestonesFor([inverted, malformed], [])).toEqual([])
  })
})

describe('milestonesInMonth', () => {
  const all = milestonesFor([courseA, courseB], [])

  it('keeps only the milestones inside the displayed calendar month', () => {
    const june = milestonesInMonth(all, new Date(2026, 5, 17))
    expect(days(june)).toEqual(['1', '24'])

    const july = milestonesInMonth(all, new Date(2026, 6, 2))
    expect(days(july)).toEqual(['7', '30'])
  })

  it('is empty for a month the term map never touches', () => {
    expect(milestonesInMonth(all, new Date(2026, 7, 1))).toEqual([])
  })
})

describe('nearestMilestonesAround — the quiet state (ADR-0048)', () => {
  const all = milestonesFor([courseA, courseB], [])

  it('names the nearest milestone in each direction from an empty month', () => {
    // August 2026 carries nothing: June's end is behind, July's end just before it.
    const { prev, next } = nearestMilestonesAround(all, new Date(2026, 7, 12))

    expect(prev?.kind).toBe('cohortEnd')
    expect(monthOf(prev)).toBe(6) // July 30 — the latest before August
    expect(dayOf(prev)).toBe(30)
    expect(next).toBeNull() // nothing after August
  })

  it('looks strictly outside the displayed month on both sides', () => {
    const { prev, next } = nearestMilestonesAround(all, new Date(2026, 4, 5)) // May

    expect(prev).toBeNull() // nothing before May
    expect(next?.kind).toBe('cohortStart')
    expect(monthOf(next)).toBe(5) // June 1
    expect(dayOf(next)).toBe(1)
  })

  it('dead-ends at neither edge when the term map is empty', () => {
    expect(nearestMilestonesAround([], new Date(2026, 5, 17))).toEqual({ prev: null, next: null })
  })
})
