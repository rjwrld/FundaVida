import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { fullName } from '@/lib/personName'
import { TcuListPage } from '@/pages/TcuListPage'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <TcuListPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<TcuListPage /> — roster multi-query gate (ADR-0030)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** The roster is the only TCU table with a "Status" column; find it by that. */
  function rosterTable(): HTMLTableElement | null {
    return (
      Array.from(document.querySelectorAll('table')).find((tbl) =>
        Array.from(tbl.querySelectorAll('th')).some((th) => th.textContent === 'Status')
      ) ?? null
    )
  }

  // First-paint regression: each roster row reads a trainee name from the
  // separate trainees query, so gating the table on the activities query alone
  // painted blank names in the window where activities resolved first.
  // resolveQueries holds the table until BOTH resolve.
  it('the first painted roster already has trainee names while trainees loads slower', async () => {
    useStore.getState().setRole('admin')
    const trainee = useStore.getState().tcuTrainees[0]
    if (!trainee) throw new Error('seed: no TCU trainees')
    const traineeName = fullName(trainee)

    // Hold trainees open well past activities so the window where the OLD
    // activities-only gate would paint the table with blank names is wide and
    // deterministic instead of a sub-tick race.
    const listTrainees = api.trainees.list
    vi.spyOn(api.trainees, 'list').mockImplementation(async () => {
      await delay(600)
      return listTrainees()
    })

    // Capture the roster's text the very first frame it exists — a waiting findBy*
    // could poll only after a blank-name flash had already resolved and miss it
    // (ADR-0030). Under the OLD activities-only gate the first roster paint would
    // hold blank trainee cells; the gate now holds it until trainees resolve.
    let firstRosterText: string | null = null
    const observer = new MutationObserver(() => {
      if (firstRosterText !== null) return
      const roster = rosterTable()
      if (roster) firstRosterText = roster.textContent
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    try {
      renderPage()
      const names = await screen.findAllByText(traineeName)
      expect(names.length).toBeGreaterThan(0)
      // The FIRST frame the roster ever painted already carried real names.
      expect(firstRosterText).toContain(traineeName)
    } finally {
      observer.disconnect()
    }
  })

  // Status labels resolve through a dynamic key (t(`tcu.list.status.${a.status}`)),
  // which the i18n extractor can't see — without manifest lines in keys.ts the
  // extractor prunes the keys and the raw key string renders in the badge.
  it('status badges render translated labels, not raw i18n keys', async () => {
    useStore.getState().setRole('admin')
    const trainee = useStore.getState().tcuTrainees[0]
    if (!trainee) throw new Error('seed: no TCU trainees')

    renderPage()
    await screen.findAllByText(fullName(trainee))

    const roster = rosterTable()
    if (!roster) throw new Error('roster table not found')
    expect(roster.textContent).not.toContain('tcu.list.status.')
    expect(
      ['Pending', 'Approved', 'Rejected'].some((label) => roster.textContent?.includes(label))
    ).toBe(true)
  })

  // The trainee-progress roster (#367) replaces the old trainee dropdown: one row
  // per scoped trainee with the approved/pending split, and selecting a row is the
  // activity log's filter.
  it('shows per-trainee hours and filters the log by roster selection (toggle to clear)', async () => {
    useStore.getState().setRole('admin')
    const { tcuActivities, tcuTrainees } = useStore.getState()
    const activity = tcuActivities[0]
    if (!activity) throw new Error('seed: no TCU activities')
    const trainee = tcuTrainees.find((tr) => tr.id === activity.traineeId)
    if (!trainee) throw new Error('seed: activity without trainee')
    const name = fullName(trainee)
    const ownCount = tcuActivities.filter((a) => a.traineeId === trainee.id).length
    const totalCount = tcuActivities.length

    renderPage()

    // The roster row carries the approved/pending derivation (same split as the
    // volunteer's own card — tcuHoursByStatus).
    const toggle = await screen.findByRole('button', {
      name: `Show only ${name}'s activities`,
    })
    const rosterRow = toggle.closest('tr')
    if (!rosterRow) throw new Error('roster row not found')
    const approved = tcuActivities
      .filter((a) => a.traineeId === trainee.id && a.status === 'approved')
      .reduce((sum, a) => sum + a.hours, 0)
    expect(within(rosterRow).getByText(`${approved}/300`)).toBeInTheDocument()

    // Select: the log narrows to the trainee's activities — every row names them.
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    const log = rosterTable()
    if (!log) throw new Error('activity log table not found')
    expect(within(log).getAllByRole('row')).toHaveLength(ownCount + 1) // + header row
    // Toggle again: the filter clears and the full log returns.
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(within(log).getAllByRole('row')).toHaveLength(totalCount + 1)
  })
})
