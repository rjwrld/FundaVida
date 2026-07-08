import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { DashboardPage } from '@/pages/DashboardPage'
import { useStore } from '@/data/store'
import { clock } from '@/lib/clock'
import { dashboardStatDeltas } from '@/lib/stats'
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

  it('leads with the four stat-row labels — no welcome banner (issue #273)', () => {
    renderDashboard()
    expect(screen.queryByRole('heading', { name: /hola,/i })).not.toBeInTheDocument()
    expect(screen.getByText('Total students')).toBeInTheDocument()
    expect(screen.getByText('Active courses')).toBeInTheDocument()
    expect(screen.getByText('Certificates issued')).toBeInTheDocument()
    expect(screen.getByText('TCU hours')).toBeInTheDocument()
  })

  it('shows each stat card its real month-over-month trend, not a hardcoded one', () => {
    renderDashboard()
    const s = useStore.getState()
    const deltas = dashboardStatDeltas(
      {
        students: s.students,
        enrollments: s.enrollments,
        certificates: s.certificates,
        tcuActivities: s.tcuActivities,
      },
      clock.now()
    )
    const cases: [RegExp, number | null][] = [
      [/total students/i, deltas.totalStudents],
      [/active courses/i, deltas.activeCourses],
      [/certificates issued/i, deltas.certsIssued],
      [/tcu hours/i, deltas.tcuHours],
    ]
    for (const [label, delta] of cases) {
      const card = screen.getByText(label).closest('div.group') as HTMLElement
      if (delta === null) {
        expect(within(card).queryByText(/vs last month/i)).toBeNull()
      } else {
        const pct = Math.abs(Math.round(delta * 100))
        // not preceded by a digit, so "0%" can't match inside "10%"
        expect(within(card).getByText(new RegExp(`(^|\\D)${pct}%`))).toBeInTheDocument()
        expect(within(card).getByText(/vs last month/i)).toBeInTheDocument()
      }
    }
  })

  it('renders the actionable supporting cards (courses to close, at-risk, funnel)', () => {
    renderDashboard()
    // The filler TopCourses/RecentActivity cards are replaced by role-scoped,
    // actionable cards (issue #155).
    expect(screen.getByRole('heading', { name: /courses to close/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /students at risk/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /enrollment funnel by campus/i })
    ).toBeInTheDocument()
  })

  it('renders the right-panel agenda slice and upcoming list', async () => {
    renderDashboard()
    // The agenda slice replaces the decorative DashboardCalendar (ADR-0038); it
    // always ends with an Open Calendar link, and admin also gets the
    // operational-nudges "On your radar" section below it.
    const aside = screen.getByRole('complementary')
    expect(aside).toBeInTheDocument()
    expect(await within(aside).findByRole('link', { name: /open calendar/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /on your radar/i })).toBeInTheDocument()
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
    // with next-sessions and the announcements feed as supporting reads.
    expect((await screen.findAllByText(/needs marking/i)).length).toBeGreaterThan(0)
    expect(screen.getByText(/next sessions to mark/i)).toBeInTheDocument()
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
