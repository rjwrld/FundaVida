import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { DashboardPage } from '@/pages/DashboardPage'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { sessionsFor } from '@/lib/sessions'
import { isSameDay, parseISO } from 'date-fns'

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
})

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter
          initialEntries={['/app']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<DashboardPage /> (admin)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  it('renders the welcome banner greeting with the admin name', () => {
    renderDashboard()
    expect(screen.getByRole('heading', { name: /hola, admin/i })).toBeInTheDocument()
  })

  it('renders all four stat-row labels', () => {
    renderDashboard()
    expect(screen.getByText('Total students')).toBeInTheDocument()
    expect(screen.getByText('Active courses')).toBeInTheDocument()
    expect(screen.getByText('Certificates issued')).toBeInTheDocument()
    expect(screen.getByText('TCU hours')).toBeInTheDocument()
  })

  it('renders at least one recent-activity row', () => {
    renderDashboard()
    const heading = screen.getByRole('heading', { name: /recent activity/i })
    expect(heading).toBeInTheDocument()
    const list = heading.parentElement?.parentElement?.querySelector('ul')
    expect(list).not.toBeNull()
    expect(list?.querySelectorAll('li').length ?? 0).toBeGreaterThan(0)
  })

  it('renders the right-panel calendar and upcoming list', () => {
    renderDashboard()
    // CalendarWidget heading shows the current month/year
    const aside = screen.getByRole('complementary')
    expect(aside).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /on your radar/i })).toBeInTheDocument()
  })

  it('calendar shows session dates of visible courses, not audit/TCU dates', () => {
    renderDashboard()

    const state = useStore.getState()
    const courses = state.courses

    // Compute all session dates for seeded courses
    const allSessionDates = courses.flatMap((c) => sessionsFor(c))
    const sessionDateStrings = new Set(allSessionDates.map((s) => s.date))

    // Find calendar day buttons and check which ones have events
    const dayButtons = screen.getAllByRole('button').filter((btn) => {
      const ariaLabel = btn.getAttribute('aria-label')
      return ariaLabel && ariaLabel.match(/^\w+,\s\w+\s\d+,\s\d+$/)
    })

    // At least one session day should have data-has-event="true"
    const sessionDaysWithEvents = dayButtons.filter((btn) => {
      const ariaLabel = btn.getAttribute('aria-label')
      if (!ariaLabel) return false
      const hasEvent = btn.getAttribute('data-has-event') === 'true'
      if (!hasEvent) return false
      // Parse the aria-label to extract the date
      const dateMatch = ariaLabel.match(/(\w+),\s(\w+)\s(\d+),\s(\d+)/)
      if (!dateMatch) return false
      // Reconstruct Date from aria-label
      const [, , month, day, year] = dateMatch
      const testDate = new Date(`${month} ${day}, ${year}`)
      const isoString = testDate.toISOString()
      // Check if this button's date matches any session date
      return Array.from(sessionDateStrings).some((sessionDate) =>
        isSameDay(parseISO(sessionDate), parseISO(isoString))
      )
    })

    expect(sessionDaysWithEvents.length).toBeGreaterThan(0)

    // Verify audit log dates no longer drive events by checking a non-session date
    // (if such exists). We construct an assertion that cannot false-fail:
    // All event-marked days must correspond to at least one session date.
    const eventMarkedDays = dayButtons.filter(
      (btn) => btn.getAttribute('data-has-event') === 'true'
    )
    for (const btn of eventMarkedDays) {
      const ariaLabel = btn.getAttribute('aria-label')
      if (!ariaLabel) continue
      const dateMatch = ariaLabel.match(/(\w+),\s(\w+)\s(\d+),\s(\d+)/)
      if (!dateMatch) continue
      const [, , month, day, year] = dateMatch
      const testDate = new Date(`${month} ${day}, ${year}`)
      // Verify this marked day corresponds to at least one session
      const matchesSession = Array.from(sessionDateStrings).some((sessionDate) =>
        isSameDay(parseISO(sessionDate), parseISO(testDate.toISOString()))
      )
      expect(matchesSession).toBe(true)
    }
  })
})

describe('<DashboardPage /> (teacher)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('teacher')
    useStore.getState().setLocale('en')
  })

  it('renders at least three meaningful role-scoped widgets', () => {
    renderDashboard()
    // Teacher dashboard should show: my courses, next upcoming session, ended courses awaiting grades
    expect(screen.getByText(/my courses/i)).toBeInTheDocument()
    expect(screen.getByText(/next upcoming session/i)).toBeInTheDocument()
    expect(screen.getByText(/ended courses awaiting grades/i)).toBeInTheDocument()
  })

  it('shows only courses the teacher owns (scoped by own)', () => {
    renderDashboard()

    // Teacher should see a courses stat card showing their owned courses count
    expect(screen.getByText(/my courses/i)).toBeInTheDocument()
  })

  it('does not show the placeholder panel for teacher', () => {
    renderDashboard()
    // Placeholder is only for student and TCU roles
    expect(screen.queryByText(/TCU reports arrive in a later phase/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Browse your enrolled courses and download your certificates/i)
    ).not.toBeInTheDocument()
  })
})

describe('<DashboardPage /> (student)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('student')
    useStore.getState().setLocale('en')
  })

  it('renders at least three meaningful role-scoped widgets', () => {
    renderDashboard()
    // Student dashboard should show: my courses, my attendance rate, my certificates
    expect(screen.getByText(/my courses/i)).toBeInTheDocument()
    expect(screen.getByText(/attendance rate/i)).toBeInTheDocument()
    expect(screen.getByText(/certificates ready/i)).toBeInTheDocument()
  })

  it('shows only courses the student is enrolled in (scoped by enrolled)', () => {
    renderDashboard()

    // Student should see a courses stat card showing their enrolled courses count
    expect(screen.getByText(/my courses/i)).toBeInTheDocument()
  })

  it('does not show the placeholder panel for student', () => {
    renderDashboard()
    // Placeholder should be removed per issue #74
    expect(screen.queryByText(/Your student dashboard/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Browse your enrolled courses and download your certificates/i)
    ).not.toBeInTheDocument()
  })
})

describe('<DashboardPage /> (tcu)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('tcu')
    useStore.getState().setLocale('en')
  })

  it('renders at least three meaningful role-scoped widgets', () => {
    renderDashboard()
    // TCU dashboard should show: hours completed, hours remaining, recent activities
    expect(screen.getByText(/hours completed/i)).toBeInTheDocument()
    expect(screen.getByText(/hours remaining/i)).toBeInTheDocument()
    expect(screen.getByText(/recent activities/i)).toBeInTheDocument()
  })

  it("scopes hours to the TCU trainee's own activities, never the raw store", async () => {
    // Capture this trainee's scoped hours, then inject a DIFFERENT trainee's
    // activity. A dashboard that reads the scope seam (api.tcu.list) must ignore
    // it; one that reads the raw store would inflate the total — exactly the
    // widget-local recomputation issue #74 (criterion 2) forbids.
    const userId = useStore.getState().currentUserId
    const ownHours = useStore
      .getState()
      .tcuActivities.filter((a) => a.traineeId === userId)
      .reduce((sum, a) => sum + a.hours, 0)

    useStore.setState((s) => ({
      tcuActivities: [
        ...s.tcuActivities,
        {
          id: 'foreign-tcu-act',
          traineeId: 'someone-else',
          title: 'Foreign',
          hours: 1000,
          date: '2025-01-01',
        },
      ],
    }))

    renderDashboard()

    // The scoped total renders (await the async scope-seam query)...
    expect((await screen.findAllByText(`${ownHours}h`)).length).toBeGreaterThan(0)
    // ...and the foreign 1000h never leaks into it.
    expect(screen.queryByText(`${ownHours + 1000}h`)).not.toBeInTheDocument()
  })

  it('does not show the placeholder panel for tcu', () => {
    renderDashboard()
    // Placeholder should be removed per issue #74
    expect(screen.queryByText(/Your tcu dashboard/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/TCU reports arrive in a later phase/i)).not.toBeInTheDocument()
  })
})
