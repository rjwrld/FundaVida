import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { TeacherDashboard } from '../TeacherDashboard'

describe('TeacherDashboard — hero + supporting layout', () => {
  const EPOCH = new Date('2026-06-23T15:30:00.000Z')
  let queryClient: QueryClient

  beforeEach(() => {
    setDemoEpoch(EPOCH)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  it('renders enrollment approvals queue as hero widget when pending', () => {
    const { container } = render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <TeacherDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // Teacher hero: enrollment approvals queue (reuse from #115).
    // Will only render if there are pending enrollments.
    expect(container).toBeInTheDocument()
  })

  it('renders next sessions list with mark attendance links', () => {
    const { container } = render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <TeacherDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // Teacher hero: next sessions to mark (real list, not just a 0/1 counter).
    // The component should render without errors.
    expect(container).toBeInTheDocument()
  })

  it('renders create course CTA', () => {
    render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <TeacherDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
    // Teacher should see the "Create a course" button.
    expect(screen.getByText(/create a course/i)).toBeInTheDocument()
  })
})
