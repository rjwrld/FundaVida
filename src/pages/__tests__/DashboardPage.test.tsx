import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion')
  return { ...actual, useReducedMotion: () => true }
})

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/app']}>
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

  it('leads with the four stat-row labels — no welcome banner (issue #273)', () => {
    renderDashboard()
    expect(screen.queryByRole('heading', { name: /hola,/i })).not.toBeInTheDocument()
    expect(screen.getByText('Total students')).toBeInTheDocument()
    expect(screen.getByText('Active courses')).toBeInTheDocument()
    expect(screen.getByText('Certificates issued')).toBeInTheDocument()
    expect(screen.getByText('TCU hours')).toBeInTheDocument()
  })

  // The tiles are plain counts: a month-over-month chip on a freshly seeded demo
  // is a vanity number, and the tinted gradient was decoration (ADR-0050).
  it('shows each stat as a plain number — no trend chip, no gradient', () => {
    renderDashboard()
    for (const label of [
      /total students/i,
      /active courses/i,
      /certificates issued/i,
      /tcu hours/i,
    ]) {
      const card = screen.getByText(label).closest('[data-slot="card"]') as HTMLElement
      expect(within(card).queryByText(/vs last month/i)).toBeNull()
      expect(within(card).queryByText(/%/)).toBeNull()
      expect(card.className).not.toMatch(/gradient/)
    }
  })

  it('renders the actionable supporting cards (courses to close, at-risk)', async () => {
    renderDashboard()
    // The filler TopCourses/RecentActivity cards are replaced by role-scoped,
    // actionable cards (issue #155).
    expect(await screen.findByRole('heading', { name: /courses to close/i })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /students at risk/i })).toBeInTheDocument()
  })

  // The admin's agenda pulse repeated the worklists beside it; the dashboard drops
  // the aside and the main column takes the full width (ADR-0050). The calendar
  // page's own sidebar keeps the pulse.
  it('renders no agenda aside', async () => {
    renderDashboard()
    await screen.findByRole('heading', { name: /students at risk/i })
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
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

  it('renders at least three meaningful role-scoped widgets', async () => {
    renderDashboard()
    // Worklist-first (ADR-0043): needs-marking + courses-to-close + own courses,
    // with the announcements feed as a supporting read.
    expect((await screen.findAllByText(/needs marking/i)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/courses to close/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/my courses/i).length).toBeGreaterThan(0)
  })

  it('shows only courses the teacher owns (scoped by own)', async () => {
    renderDashboard()

    // The own-courses list (with display-state badges) reads the scoped query.
    expect(await screen.findByRole('heading', { name: 'My courses' })).toBeInTheDocument()
  })

  it('does not show the placeholder panel for teacher', () => {
    renderDashboard()
    // Placeholder is only for student and TCU roles
    expect(screen.queryByText(/TCU reports arrive in a later phase/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Browse your enrolled courses and download your certificates/i)
    ).not.toBeInTheDocument()
  })

  it('renders the role-scoped agenda slice in the dashboard aside', async () => {
    renderDashboard()
    const aside = screen.getByRole('complementary')
    expect(await within(aside).findByRole('link', { name: /open calendar/i })).toBeInTheDocument()
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

  it('renders the student role-scoped widgets', async () => {
    renderDashboard()
    // Content-first (ADR-0043): the My-courses roll-up table and the announcements feed.
    expect(screen.getByRole('heading', { name: 'My courses' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
  })

  it('shows only courses the student is enrolled in (scoped by enrolled)', () => {
    renderDashboard()

    // The My-courses roll-up reads the enrolled-scoped progress queries.
    expect(screen.getByRole('heading', { name: 'My courses' })).toBeInTheDocument()
  })

  it('does not show the placeholder panel for student', () => {
    renderDashboard()
    // Placeholder should be removed per issue #74
    expect(screen.queryByText(/Your student dashboard/i)).not.toBeInTheDocument()
    expect(
      screen.queryByText(/Browse your enrolled courses and download your certificates/i)
    ).not.toBeInTheDocument()
  })

  it('renders the role-scoped agenda slice in the dashboard aside', async () => {
    renderDashboard()
    const aside = screen.getByRole('complementary')
    expect(await within(aside).findByRole('link', { name: /open calendar/i })).toBeInTheDocument()
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

  it('renders at least three meaningful role-scoped widgets', async () => {
    renderDashboard()
    // TCU dashboard should show: hours completed, hours remaining, recent activities.
    // It gates on its scope-seam queries (ADR-0030), so await the first paint.
    expect(await screen.findByText(/hours completed/i)).toBeInTheDocument()
    expect(screen.getByText(/hours remaining/i)).toBeInTheDocument()
    expect(screen.getByText(/recent activities/i)).toBeInTheDocument()
  })

  it("scopes hours to the TCU trainee's own activities, never the raw store", async () => {
    // Capture this trainee's scoped APPROVED hours (the dashboard counts
    // approved-only toward the target, ADR-0036), then inject a DIFFERENT
    // trainee's activity. A dashboard that reads the scope seam (api.tcu.list)
    // must ignore it; one that reads the raw store would inflate the total —
    // exactly the widget-local recomputation issue #74 (criterion 2) forbids.
    const userId = useStore.getState().currentUserId
    const approvedOwnHours = useStore
      .getState()
      .tcuActivities.filter((a) => a.traineeId === userId && a.status === 'approved')
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
          status: 'approved' as const,
        },
      ],
    }))

    renderDashboard()

    // The scoped approved total renders (await the async scope-seam query)...
    expect((await screen.findAllByText(`${approvedOwnHours}h`)).length).toBeGreaterThan(0)
    // ...and the foreign 1000h never leaks into it.
    expect(screen.queryByText(`${approvedOwnHours + 1000}h`)).not.toBeInTheDocument()
  })

  it('does not show the placeholder panel for tcu', () => {
    renderDashboard()
    // Placeholder should be removed per issue #74
    expect(screen.queryByText(/Your tcu dashboard/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/TCU reports arrive in a later phase/i)).not.toBeInTheDocument()
  })
})
