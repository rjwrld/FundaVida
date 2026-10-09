import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
import { TcuDashboard } from '@/components/dashboard/TcuDashboard'
import { TcuListPage } from '@/pages/TcuListPage'
import type { TcuActivity } from '@/types'

function renderWithProviders(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>{node}</MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/**
 * Activities in deliberately scrambled store order. Two share a date, so the
 * tiebreak (id) decides between them deterministically.
 */
function scrambled(): TcuActivity[] {
  const trainee = useStore.getState().tcuTrainees[0]
  if (!trainee) throw new Error('seed: no TCU trainees')
  const make = (id: string, title: string, date: string, status: TcuActivity['status']) => ({
    id,
    traineeId: trainee.id,
    title,
    hours: 4,
    date,
    status,
  })
  return [
    make('act-902', 'Pending mid', '2026-02-10', 'pending'),
    make('act-905', 'Approved newest', '2026-05-01', 'approved'),
    make('act-901', 'Pending oldest', '2026-01-10', 'pending'),
    make('act-904', 'Pending newest (b)', '2026-03-10', 'pending'),
    make('act-903', 'Pending newest (a)', '2026-03-10', 'pending'),
  ]
}

const titlesIn = (scope: HTMLElement, titles: string[]) =>
  within(scope)
    .getAllByRole('row')
    .map((row) => titles.find((title) => row.textContent?.includes(title)))
    .filter(Boolean)

describe('TCU activity order', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  // An approval queue is first in, first out: the longest-waiting request leads.
  it('lists the approval queue oldest first, ties broken by id', async () => {
    useStore.setState({ tcuActivities: scrambled() })
    renderWithProviders(<TcuApprovalQueue />)

    const table = await screen.findByRole('table')
    expect(
      titlesIn(table, ['Pending oldest', 'Pending mid', 'Pending newest (a)', 'Pending newest (b)'])
    ).toEqual(['Pending oldest', 'Pending mid', 'Pending newest (a)', 'Pending newest (b)'])
  })

  // A log reads like a feed: the latest work first.
  it('opens the TCU dashboard’s activity table on the newest activity', async () => {
    const trainee = useStore.getState().tcuTrainees[0]
    if (!trainee) throw new Error('seed: no TCU trainees')
    useStore.setState({ tcuActivities: scrambled() })
    useStore.getState().setRole('tcu')
    useStore.setState({ currentUserId: trainee.id })
    renderWithProviders(<TcuDashboard />)

    const table = await screen.findByRole('table')
    expect(
      titlesIn(table, ['Approved newest', 'Pending newest (b)', 'Pending newest (a)'])
    ).toEqual(['Approved newest', 'Pending newest (b)', 'Pending newest (a)'])
  })

  it('orders the TCU page’s log newest first and its queue oldest first', async () => {
    useStore.setState({ tcuActivities: scrambled() })
    renderWithProviders(<TcuListPage />)

    const all = [
      'Approved newest',
      'Pending newest (b)',
      'Pending newest (a)',
      'Pending mid',
      'Pending oldest',
    ]
    const tables = await screen.findAllByRole('table')
    const log = tables.find((t) => t.textContent?.includes('Approved newest'))
    const queue = tables.find((t) => t !== log && t.textContent?.includes('Pending oldest'))
    if (!log || !queue) throw new Error('expected the activity log and the approval queue')

    expect(titlesIn(log, all)).toEqual(all)
    expect(titlesIn(queue, all)).toEqual([
      'Pending oldest',
      'Pending mid',
      'Pending newest (a)',
      'Pending newest (b)',
    ])
  })
})
