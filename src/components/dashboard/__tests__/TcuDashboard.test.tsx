import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { TcuDashboard } from '../TcuDashboard'
import type { Course, TcuActivity, TcuTrainee, Weekday } from '@/types'

// Fixed Demo Epoch (ADR-0014): today is Tue, June 23 2026, so the assigned
// Course's Tue/Thu sessions land deterministically for the next-Session line.
const EPOCH = new Date('2026-06-23T15:30:00.000Z')

function isoDay(year: number, monthIndex: number, day: number): string {
  return new Date(year, monthIndex, day).toISOString()
}

// tcu-1 is the tcu persona's userId (userIdForRole). The trainee's id === userId,
// its courseId pins the assigned Course the 'assigned' scope resolves (ADR-0036).
const assignedCourse: Course = {
  id: 'cou-tcu',
  name: 'Robótica Comunitaria',
  description: '',
  sede: 'Hatillo',
  programId: 'prog-1',
  level: 'secundaria',
  status: 'published',
  capacity: 20,
  teacherId: 'tea-9',
  term: { start: isoDay(2026, 5, 1), end: isoDay(2026, 5, 30) },
  meetingDays: ['tue', 'thu'] as Weekday[],
  createdAt: isoDay(2026, 4, 1),
}

const trainee: TcuTrainee = {
  id: 'tcu-1',
  firstName: 'Vera',
  lastName: 'Núñez',
  email: 'vera@u.cr',
  sede: 'Hatillo',
  university: 'Universidad de Costa Rica',
  courseId: 'cou-tcu',
  createdAt: isoDay(2026, 3, 1),
}

function activity(over: Partial<TcuActivity>): TcuActivity {
  return {
    id: 'act-x',
    traineeId: 'tcu-1',
    title: 'Taller',
    hours: 10,
    date: isoDay(2026, 4, 10),
    status: 'pending',
    ...over,
  }
}

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TcuDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<TcuDashboard /> — assigned Course card + approved-only hours (ADR-0036)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    // Per-activity hours (60/40/30/20) are deliberately distinct from the
    // aggregates they roll up to (100 approved, 200 remaining, 50 pending), so a
    // getByText on a stat value can never also match an activity-row's hours.
    useStore.setState({
      courses: [assignedCourse],
      tcuTrainees: [trainee],
      tcuActivities: [
        activity({ id: 'a1', hours: 60, status: 'approved' }),
        activity({ id: 'a3', hours: 40, status: 'approved' }),
        activity({ id: 'a2', hours: 30, status: 'pending' }),
        activity({ id: 'a4', hours: 20, status: 'pending' }),
      ],
    })
    useStore.getState().setRole('tcu')
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('paints a loading skeleton, not a false "no course" state, while its reads resolve', () => {
    renderDashboard()

    // First synchronous paint: the scope-seam queries are still pending.
    expect(screen.getAllByRole('status', { name: /loading/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /log hours/i })).not.toBeInTheDocument()
  })

  it('opens the main column with an h2, bridging the PageHeader h1 to the h3 cards', async () => {
    renderDashboard()

    // The first synchronous paint is the pending gate's skeletons. The shell's
    // h2 leads there too, so the loading frame never skips a heading level.
    expect(screen.getAllByRole('heading')[0]?.tagName).toBe('H2')

    await screen.findByText('Robótica Comunitaria')
    expect(screen.getAllByRole('heading')[0]?.tagName).toBe('H2')
  })

  it('renders the assigned-Course card with campus, meeting days, and a Log hours CTA', async () => {
    renderDashboard()

    expect(await screen.findByText('Robótica Comunitaria')).toBeInTheDocument()
    // Campus (Sede) and the meeting days derived from the assigned Course.
    expect(screen.getByText('Hatillo')).toBeInTheDocument()
    expect(screen.getByText('Tuesday, Thursday')).toBeInTheDocument()
    // The role's primary action lives on the card (opens LogTcuActivityDialog).
    expect(screen.getByRole('button', { name: /log hours/i })).toBeInTheDocument()
  })

  // Today's Session is still recordable, so the upcoming-only derivation skips it
  // (ADR-0034); on a session day the hero must say the volunteer serves today.
  // The epoch is pinned after resetDemo, which re-anchors the clock to wall time.
  it('reads "Today" as the next session on a session day', async () => {
    setDemoEpoch(new Date(2026, 5, 23, 10, 0)) // Tue, a Tue/Thu meeting day
    renderDashboard()

    expect(await screen.findByText('Next session: Today')).toBeInTheDocument()
  })

  // Session exceptions overlay the base schedule (ADR-0039): a cancelled Session
  // is not "Today", and one rescheduled onto today is.
  it('does not read "Today" when today’s Session was cancelled', async () => {
    setDemoEpoch(new Date(2026, 5, 23, 10, 0)) // Tue, a meeting day
    useStore.setState({
      sessionExceptions: [
        {
          id: 'sx-cancel',
          courseId: 'cou-tcu',
          type: 'cancelled',
          date: isoDay(2026, 5, 23),
          createdAt: isoDay(2026, 5, 1),
        },
      ],
    })
    renderDashboard()

    const line = await screen.findByText(/^Next session: /)
    expect(line).not.toHaveTextContent('Today')
    expect(line).toHaveTextContent(/25/)
  })

  it('reads "Today" when a Session was rescheduled onto today', async () => {
    setDemoEpoch(new Date(2026, 5, 24, 10, 0)) // Wed, not a meeting day
    useStore.setState({
      sessionExceptions: [
        {
          id: 'sx-move',
          courseId: 'cou-tcu',
          type: 'rescheduled',
          date: isoDay(2026, 5, 25),
          newDate: isoDay(2026, 5, 24),
          createdAt: isoDay(2026, 5, 1),
        },
      ],
    })
    renderDashboard()

    expect(await screen.findByText('Next session: Today')).toBeInTheDocument()
  })

  it('names the next meeting day on a day without a session', async () => {
    setDemoEpoch(new Date(2026, 5, 24, 10, 0)) // Wed → next is Thu, Jun 25
    renderDashboard()

    const line = await screen.findByText(/^Next session: /)
    expect(line).not.toHaveTextContent('Today')
    expect(line).toHaveTextContent(/25/)
  })

  // One progress bar replaces the three stat tiles (ADR-0050): approved-only
  // progress toward 300 (ADR-0036), pending named beside it, never folded in.
  it('shows one progress line — approved toward 300, pending beside it', async () => {
    renderDashboard()

    expect(await screen.findByText('100 / 300 h approved · +50 pending')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: '100 of 300 approved hours' })
    ).toBeInTheDocument()
    // The old divergence summed ALL hours (150) — must not recur.
    expect(screen.queryByText(/150/)).not.toBeInTheDocument()
    // The three stat tiles are gone.
    expect(screen.queryByText(/hours completed/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/hours remaining/i)).not.toBeInTheDocument()
  })

  it('lists every activity newest first: Activity, Hours, Date, Status — no Trainee column', async () => {
    useStore.setState({
      tcuActivities: [
        activity({ id: 'a1', title: 'Oldest', date: isoDay(2026, 4, 1), status: 'approved' }),
        activity({ id: 'a2', title: 'Newest', date: isoDay(2026, 5, 20), status: 'pending' }),
        activity({ id: 'a3', title: 'Middle', date: isoDay(2026, 4, 15), status: 'rejected' }),
      ],
    })
    renderDashboard()

    const region = await screen.findByRole('region', { name: 'My activities' })
    const table = within(region).getByRole('table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Activity', 'Hours', 'Date', 'Status'])
    const titles = within(table)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('cell')[0]?.textContent)
    expect(titles).toEqual(['Newest', 'Middle', 'Oldest'])
    expect(within(table).getByText('Pending')).toBeInTheDocument()
  })

  it('keeps the assigned Course’s slim announcements feed and has no agenda aside', async () => {
    renderDashboard()

    expect(await screen.findByRole('region', { name: 'Announcements' })).toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('holds the whole dashboard until Courses resolve — the card never flashes in after the stats', async () => {
    // Hold the Courses query open well past activities/trainees so an ungated
    // dashboard would paint the hours progress with an empty (default-[]) Courses
    // list first, dropping the card. resolveQueries holds all three (ADR-0030).
    const listCourses = api.courses.list
    vi.spyOn(api.courses, 'list').mockImplementation(async (...args) => {
      await delay(600)
      return listCourses(...args)
    })

    // Capture the DOM the first frame the hours progress ever paints. Under the
    // gate that frame must already carry the assigned-Course name.
    let firstStatsText: string | null = null
    const observer = new MutationObserver(() => {
      if (firstStatsText !== null) return
      if (document.body.textContent?.includes('h approved')) {
        firstStatsText = document.body.textContent
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    try {
      renderDashboard()
      await screen.findByText('Robótica Comunitaria')
      expect(firstStatsText).toContain('Robótica Comunitaria')
    } finally {
      observer.disconnect()
    }
  })

  it('renders the hours progress without a course card when the user has no trainee record', async () => {
    // Defensive edge (ADR-0036): the seed always assigns a Course, but a userId
    // with no trainee record must render its hours — never crash or flash a card.
    useStore.setState({
      tcuTrainees: [],
      tcuActivities: [
        activity({ id: 'a1', hours: 60, status: 'approved' }),
        activity({ id: 'a3', hours: 40, status: 'approved' }),
      ],
    })

    renderDashboard()

    expect(await screen.findByText('100 / 300 h approved')).toBeInTheDocument()
    // No assigned Course → no card, no name, no Log-hours CTA.
    expect(screen.queryByText('Robótica Comunitaria')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log hours/i })).not.toBeInTheDocument()
  })
})
