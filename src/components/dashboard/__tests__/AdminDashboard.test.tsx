import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import { AdminDashboard } from '../AdminDashboard'

describe('AdminDashboard — hero + supporting layout', () => {
  const EPOCH = new Date('2026-06-15T12:00:00.000Z')
  let queryClient: QueryClient

  beforeEach(() => {
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  function renderDashboard() {
    return render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
  }

  it('surfaces no certificate-approval widget (approval removed, ADR-0024)', () => {
    renderDashboard()
    // Certificates emit on course close — there is no pending queue to review.
    expect(screen.queryByText(/pending approvals/i)).not.toBeInTheDocument()
  })

  it('renders org health stats (active courses, students, etc.)', () => {
    renderDashboard()
    // AdminDashboard shows: total students, active courses, certs issued, tcu hours.
    expect(screen.getByText(/total students/i)).toBeInTheDocument()
    expect(screen.getByText(/active courses/i)).toBeInTheDocument()
  })

  it('opens the main column with an h2, bridging the PageHeader h1 to the h3 cards', async () => {
    renderDashboard()
    const headings = await screen.findAllByRole('heading')
    expect(headings[0]?.tagName).toBe('H2')
  })

  it('renders the actionable supporting cards (courses to close, certs, at-risk, funnel)', async () => {
    renderDashboard()
    expect(screen.getByText(/courses to close/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /certificates this epoch/i })).toBeInTheDocument()
    expect(screen.getByText(/students at risk/i)).toBeInTheDocument()
    // The funnel gates on its queries (ADR-0030) AND arrives through a lazy
    // chunk (#353), so its title paints two async layers late — past findBy's
    // default 1s on a slow CI runner.
    expect(
      await screen.findByText(/enrollment funnel by campus/i, {}, { timeout: 4000 })
    ).toBeInTheDocument()
  })
})
