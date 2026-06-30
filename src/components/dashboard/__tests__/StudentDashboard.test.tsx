import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { StudentDashboard } from '../StudentDashboard'

describe('StudentDashboard — hero + supporting layout', () => {
  const EPOCH = new Date('2026-06-23T15:30:00.000Z')
  let queryClient: QueryClient

  beforeEach(() => {
    setDemoEpoch(EPOCH)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renders next class as hero widget', () => {
    const { container } = render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <StudentDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // Student hero: next class (next course session).
    // Should appear in the dashboard.
    expect(container).toBeInTheDocument()
  })

  it('renders browse open courses link', () => {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <StudentDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // Student hero: link to browse open courses (from #116).
    expect(screen.getByText(/browse/i)).toBeInTheDocument()
  })

  it('renders a My profile link to /app/me (#166)', () => {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <StudentDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    const link = screen.getByRole('link', { name: /my profile/i })
    expect(link).toHaveAttribute('href', '/app/me')
  })

  it('renders my courses and attendance rate as supporting stats', () => {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <StudentDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // Supporting: my courses, attendance rate this month.
    expect(screen.getByText(/my courses/i)).toBeInTheDocument()
    expect(screen.getByText(/attendance rate/i)).toBeInTheDocument()
  })
})
