import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { TcuApprovalQueue } from '@/components/tcu/TcuApprovalQueue'

function renderQueue() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <TcuApprovalQueue />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

const pendingCount = () =>
  useStore.getState().tcuActivities.filter((a) => a.status === 'pending').length

describe('<TcuApprovalQueue /> (admin: every pending activity)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('is a titled card counting every pending activity, one table row each', async () => {
    const pending = pendingCount()
    expect(pending, 'seed should leave TCU hours to approve').toBeGreaterThan(0)
    renderQueue()

    const card = await screen.findByRole('region', { name: 'TCU hours to approve' })
    const heading = within(card).getByRole('heading', { level: 3, name: 'TCU hours to approve' })
    expect(heading.parentElement).toHaveTextContent(String(pending))
    // The DataTable dual-renders rows as mobile cards too; count the table's own rows.
    const table = within(card).getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(Math.min(pending, 10) + 1)
  })

  it('drops an approved activity from the queue and the count', async () => {
    const user = userEvent.setup()
    const before = pendingCount()
    renderQueue()

    const table = await screen.findByRole('table')
    const firstRow = within(table).getAllByRole('row')[1]
    if (!firstRow) throw new Error('queue should have a row')
    await user.click(within(firstRow).getByRole('button', { name: /^approve/i }))

    const card = screen.getByRole('region', { name: 'TCU hours to approve' })
    const heading = within(card).getByRole('heading', { name: 'TCU hours to approve' })
    await expect.poll(() => pendingCount()).toBe(before - 1)
    if (before - 1 > 0) {
      await screen.findByText(String(before - 1), { selector: '[data-slot="badge"]' })
    }
    expect(heading).toBeInTheDocument()
  })

  it('stays on screen with a compact empty state when nothing is pending', async () => {
    useStore.setState((s) => ({
      tcuActivities: s.tcuActivities.map((a) => ({ ...a, status: 'approved' as const })),
    }))
    renderQueue()

    const card = await screen.findByRole('region', { name: 'TCU hours to approve' })
    expect(within(card).getByText('No hours waiting for approval.')).toBeInTheDocument()
    expect(within(card).queryByRole('table')).not.toBeInTheDocument()
  })

  // A row whose trainee record is missing must still name its buttons fully,
  // never "Approve Tutoring by ".
  it('names an orphaned activity’s actions with an unknown-trainee fallback', async () => {
    useStore.setState({
      tcuActivities: [
        {
          id: 'act-orphan',
          traineeId: 'tcu-missing',
          title: 'Tutoring',
          hours: 3,
          date: '2026-06-01T00:00:00.000Z',
          status: 'pending',
        },
      ],
    })
    renderQueue()

    const table = await screen.findByRole('table')
    expect(
      within(table).getByRole('button', { name: 'Approve Tutoring by Unknown trainee' })
    ).toBeInTheDocument()
    expect(
      within(table).getByRole('button', { name: 'Reject Tutoring by Unknown trainee' })
    ).toBeInTheDocument()
  })
})
