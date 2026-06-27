import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { subMinutes } from 'date-fns'
import { I18nProvider } from '@/lib/i18n'
import { clock, setDemoEpoch } from '@/lib/clock'
import { RecentActivity } from '../RecentActivity'
import type { AuditLogEntry } from '@/types'

describe('RecentActivity — relative time on the frozen timeline (ADR-0014)', () => {
  const EPOCH = new Date('2026-06-23T15:30:00.000Z')

  beforeEach(() => {
    setDemoEpoch(EPOCH)
  })

  function entryStampedAt(timestamp: string): AuditLogEntry {
    return {
      id: 'log-1',
      actorId: 'admin',
      action: 'create',
      entity: 'student',
      entityId: 'stu-9',
      summary: 'Created a student',
      timestamp,
    }
  }

  it('formats "X ago" against clock.now(), not live wall-time', () => {
    const entry = entryStampedAt(subMinutes(clock.now(), 5).toISOString())
    render(
      <I18nProvider>
        <RecentActivity entries={[entry]} />
      </I18nProvider>
    )
    // Against the frozen now this is exactly "5 minutes ago"; against live
    // wall-time it would read as days/years.
    expect(screen.getByText(/5 minutes ago/i)).toBeInTheDocument()
  })
})
