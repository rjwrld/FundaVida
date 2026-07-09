import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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

  it('shows one loading skeleton per loaded stat card, so resolving the gate does not shift the layout', () => {
    renderDashboard()

    // First synchronous paint: the scope-seam queries are still pending, so the
    // gate renders skeletons. There must be three stat-card skeletons — one per
    // loaded StatCard (completed / remaining / pending) — not two.
    expect(screen.getAllByLabelText('Loading stat')).toHaveLength(3)
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

  it('counts approved hours only toward the target, showing pending separately', async () => {
    renderDashboard()

    await screen.findByText('Robótica Comunitaria')
    // Approved: 100h completed, 200h remaining (300 target). Pending 50h separate.
    expect(screen.getByText('100h')).toBeInTheDocument()
    expect(screen.getByText('200h')).toBeInTheDocument()
    expect(screen.getByText('50h')).toBeInTheDocument()
    // The old divergence summed ALL hours (150) into "completed" — must not recur.
    expect(screen.queryByText('150h')).not.toBeInTheDocument()
  })

  it('holds the whole dashboard until Courses resolve — the card never flashes in after the stats', async () => {
    // Hold the Courses query open well past activities/trainees so an ungated
    // dashboard would paint the hours stats with an empty (default-[]) Courses
    // list first, dropping the card. resolveQueries holds all three (ADR-0030).
    const listCourses = api.courses.list
    vi.spyOn(api.courses, 'list').mockImplementation(async (...args) => {
      await delay(600)
      return listCourses(...args)
    })

    // Capture the DOM the first frame the hours stats ever paint. Under the gate
    // that frame must already carry the assigned-Course name.
    let firstStatsText: string | null = null
    const observer = new MutationObserver(() => {
      if (firstStatsText !== null) return
      if (document.body.textContent?.includes('Hours completed')) {
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

  it('renders the hours stats without a course card when the user has no trainee record', async () => {
    // Defensive edge (ADR-0036): the seed always assigns a Course, but a userId
    // with no trainee record must render stats — never crash or flash a card.
    useStore.setState({
      tcuTrainees: [],
      tcuActivities: [
        activity({ id: 'a1', hours: 60, status: 'approved' }),
        activity({ id: 'a3', hours: 40, status: 'approved' }),
      ],
    })

    renderDashboard()

    expect(await screen.findByText('100h')).toBeInTheDocument()
    expect(screen.getByText(/hours completed/i)).toBeInTheDocument()
    // No assigned Course → no card, no name, no Log-hours CTA.
    expect(screen.queryByText('Robótica Comunitaria')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /log hours/i })).not.toBeInTheDocument()
  })
})
