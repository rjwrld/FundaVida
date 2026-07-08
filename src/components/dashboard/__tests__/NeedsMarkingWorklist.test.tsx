import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { NeedsMarkingWorklist } from '../NeedsMarkingWorklist'

const EPOCH = new Date('2026-06-23T15:30:00.000Z')

function renderWorklist() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <NeedsMarkingWorklist />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<NeedsMarkingWorklist /> — teacher hero worklist (ADR-0043/0044)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('teacher')
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('holds a skeleton until the three queries resolve — never flashes "nothing to mark" (ADR-0030)', async () => {
    // Hold attendance open past courses/exceptions so an ungated worklist would
    // read an empty ([]) attendance window and mark every Session as unmarked —
    // or, symmetrically, an empty courses window and flash the "caught up" empty
    // state. The gate holds all three until they resolve.
    const listAttendance = api.attendance.list
    vi.spyOn(api.attendance, 'list').mockImplementation(async (...args) => {
      await delay(400)
      return listAttendance(...args)
    })

    renderWorklist()

    // First synchronous paint: gate pending → the title is absent (skeleton only).
    expect(screen.queryByText(/needs marking/i)).not.toBeInTheDocument()

    // Once resolved, the real worklist (title) paints.
    expect(await screen.findByText(/needs marking/i)).toBeInTheDocument()
  })
})
