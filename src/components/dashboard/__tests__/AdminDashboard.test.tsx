import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { AdminDashboard } from '../AdminDashboard'

describe('AdminDashboard — hero + supporting layout', () => {
  const EPOCH = new Date('2026-06-23T15:30:00.000Z')
  let queryClient: QueryClient

  beforeEach(() => {
    setDemoEpoch(EPOCH)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renders pending approvals as the hero widget', () => {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AdminDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // PendingApprovals should be visible; the admin hero focuses on cert approvals.
    expect(screen.getByText(/pending approvals/i)).toBeInTheDocument()
  })

  it('renders org health stats (active courses, students, etc.)', () => {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AdminDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // AdminDashboard shows: total students, active courses, certs issued, tcu hours.
    expect(screen.getByText(/total students/i)).toBeInTheDocument()
    expect(screen.getByText(/active courses/i)).toBeInTheDocument()
  })

  it('renders recent activity as supporting widget', () => {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AdminDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    expect(screen.getByText(/recent activity/i)).toBeInTheDocument()
  })
})
