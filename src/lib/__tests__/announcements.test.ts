import { describe, it, expect } from 'vitest'
import { sessionChangeAnnouncementBody } from '../announcements'
import type { SessionException } from '@/types'

const iso = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d)).toISOString()

const cancelled: SessionException = {
  id: 'sxc-1',
  courseId: 'cou-1',
  type: 'cancelled',
  date: iso(2026, 2, 6),
  createdAt: iso(2026, 2, 1),
}
const rescheduled: SessionException = {
  id: 'sxc-2',
  courseId: 'cou-1',
  type: 'rescheduled',
  date: iso(2026, 2, 9),
  newDate: iso(2026, 2, 10),
  createdAt: iso(2026, 2, 1),
}
const extra: SessionException = {
  id: 'sxc-3',
  courseId: 'cou-1',
  type: 'extra',
  date: iso(2026, 2, 7),
  createdAt: iso(2026, 2, 1),
}

describe('sessionChangeAnnouncementBody', () => {
  it('renders English bodies for each exception type', () => {
    expect(sessionChangeAnnouncementBody('en', cancelled)).toMatch(/cancelled/i)
    expect(sessionChangeAnnouncementBody('en', rescheduled)).toMatch(/moved to/i)
    expect(sessionChangeAnnouncementBody('en', extra)).toMatch(/extra session/i)
  })

  it('renders Spanish bodies for each exception type', () => {
    expect(sessionChangeAnnouncementBody('es', cancelled)).toMatch(/cancel/i)
    expect(sessionChangeAnnouncementBody('es', rescheduled)).toMatch(/traslad/i)
    expect(sessionChangeAnnouncementBody('es', extra)).toMatch(/adicional/i)
  })

  it('names both dates in a reschedule body', () => {
    const body = sessionChangeAnnouncementBody('en', rescheduled)
    // Both the original and the target date appear (formatDate renders each).
    expect(body).toMatch(/2026/)
    expect(body.match(/2026/g)?.length).toBe(2)
  })
})
