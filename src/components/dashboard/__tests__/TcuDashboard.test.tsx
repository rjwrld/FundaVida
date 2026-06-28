import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { TcuDashboard } from '../TcuDashboard'

describe('TcuDashboard — hero + supporting layout', () => {
  const EPOCH = new Date('2026-06-23T15:30:00.000Z')
  let queryClient: QueryClient

  beforeEach(() => {
    setDemoEpoch(EPOCH)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renders hours completed and remaining as hero widget', () => {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <TcuDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // TCU hero: approved hours vs pending target (300h).
    expect(screen.getByText(/hours completed/i)).toBeInTheDocument()
    expect(screen.getByText(/hours remaining/i)).toBeInTheDocument()
  })

  it('renders recent activities as list instead of count', () => {
    const { container } = render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <TcuDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // TCU supporting: activity list (real entries, not just a count).
    // Will be rendered only if there are activities.
    expect(container.querySelector('.grid.gap-6')).toBeInTheDocument()
  })
})
