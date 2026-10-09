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
        <MemoryRouter>
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

  /** The table whose header row carries `header` (the roster: "Progress"; the log: "Status"). */
  function tableWith(header: string): HTMLTableElement | null {
    return (
      Array.from(document.querySelectorAll('table')).find((tbl) =>
        Array.from(tbl.querySelectorAll('th')).some((th) => th.textContent === header)
      ) ?? null
    )
  }
  const rosterTable = () => tableWith('Progress')
  const logTable = () => tableWith('Status')

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

  // The roster is the log's filter (#367): with no trainee selected there is no
  // log at all; selecting a row opens that trainee's log, newest first and
  // paginated, without a Trainee column it would only repeat (ADR-0051).
  it('opens a trainee’s log only when the roster selects them (toggle to clear)', async () => {
    useStore.getState().setRole('admin')
    const { tcuActivities, tcuTrainees } = useStore.getState()
    const counts = new Map<string, number>()
    for (const a of tcuActivities) counts.set(a.traineeId, (counts.get(a.traineeId) ?? 0) + 1)
    const trainee = tcuTrainees.find((tr) => (counts.get(tr.id) ?? 0) > 0)
    if (!trainee) throw new Error('seed: no trainee with activities')
    const name = fullName(trainee)
    const own = tcuActivities
      .filter((a) => a.traineeId === trainee.id)
      .sort((a, b) => b.date.localeCompare(a.date))

    renderPage()

    // The roster row carries the approved/pending derivation (same split as the
    // volunteer's own card — tcuHoursByStatus).
    const toggle = await screen.findByRole('button', {
      name: `Show only ${name}'s activities`,
    })
    const rosterRow = toggle.closest('tr')
    if (!rosterRow) throw new Error('roster row not found')
    const approved = own.filter((a) => a.status === 'approved').reduce((sum, a) => sum + a.hours, 0)
    expect(within(rosterRow).getByText(`${approved}/300`)).toBeInTheDocument()
    expect(logTable()).toBeNull()

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    const log = logTable()
    if (!log) throw new Error('activity log table not found')
    const rows = within(log).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(Math.min(own.length, 10))
    expect(rows[0]).toHaveTextContent(own[0]?.title ?? '')
    expect(within(log).queryByRole('columnheader', { name: 'Trainee' })).not.toBeInTheDocument()
    // Status labels resolve through a dynamic key the extractor can't see; the
    // keys.ts manifest keeps them, so no raw key string renders in a badge.
    expect(log.textContent).not.toContain('tcu.list.status.')

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    expect(logTable()).toBeNull()
  })

  // The page's queue is the dashboard's TcuApprovalQueue, uncapped: every pending
  // activity, no "View all" onward link (ADR-0050/0051).
  it('shows the full approval queue', async () => {
    useStore.getState().setRole('admin')
    const pending = useStore.getState().tcuActivities.filter((a) => a.status === 'pending')
    renderPage()

    const queue = await screen.findByRole('region', { name: 'TCU hours to approve' })
    // It opens a page section under the h1, so its title is an h2 (heading order).
    expect(
      within(queue).getByRole('heading', { level: 2, name: 'TCU hours to approve' })
    ).toBeInTheDocument()
    expect(within(queue).getByText(String(pending.length))).toBeInTheDocument()
    expect(within(queue).queryByRole('link', { name: /view all/i })).not.toBeInTheDocument()
  })
})
