import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
import { DashboardAnnouncementsFeed } from '../DashboardAnnouncementsFeed'
import type { Announcement, Course } from '@/types'

const EPOCH = new Date('2026-06-23T15:30:00.000Z')

function renderFeed() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DashboardAnnouncementsFeed />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

describe('<DashboardAnnouncementsFeed /> — cross-course feed (ADR-0040/0043)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists the latest posts with their Course name and the inline composer for composers', async () => {
    const course = useStore.getState().courses[0]
    if (!course) throw new Error('seed: no courses')
    const announcement: Announcement = {
      id: 'ann-test-1',
      courseId: course.id,
      body: 'Class moves to the annex on Thursday.',
      kind: 'manual',
      createdAt: EPOCH.toISOString(),
    }
    useStore.setState({ announcements: [announcement] })

    renderFeed()

    expect(await screen.findByText(/class moves to the annex/i)).toBeInTheDocument()
    // Admin may compose, so the inline composer renders (heading + post button).
    expect(screen.getByRole('heading', { name: /post an announcement/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^post$/i })).toBeInTheDocument()
  })

  it('offers the inline composer to a Teacher (owns Courses) but not to a Student', async () => {
    // Teacher: create rides `courseOwned`, and every scoped Course is owned, so
    // the composer shows.
    useStore.getState().setRole('teacher')
    const { unmount } = renderFeed()
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /post an announcement/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^post$/i })).toBeInTheDocument()
    unmount()

    // Student: view-only, no create cell — never a composer.
    useStore.getState().setRole('student')
    renderFeed()
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /post an announcement/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^post$/i })).not.toBeInTheDocument()
  })

  it('posts through the inline composer to the preselected Course', async () => {
    // Scope the store to a single non-closed cohort so the composer preselects a
    // known target and the posted announcement is unambiguous.
    const course: Course = {
      id: 'cou-solo',
      name: 'Math 101',
      description: 'Calculus',
      sede: 'Linda Vista',
      programId: 'prog-1',
      level: 'primaria',
      status: 'published',
      capacity: 20,
      teacherId: 'tea-1',
      term: { start: '2026-02-02', end: '2026-08-13' },
      meetingDays: ['mon', 'wed', 'fri'],
      createdAt: '2026-01-01T00:00:00Z',
    }
    useStore.setState({ courses: [course], announcements: [] })

    renderFeed()

    const textarea = await screen.findByPlaceholderText(/share an update with the class/i)
    await userEvent.type(textarea, 'Reminder: quiz on Friday.')
    await userEvent.click(screen.getByRole('button', { name: /^post$/i }))

    const posted = useStore.getState().announcements
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      courseId: 'cou-solo',
      body: 'Reminder: quiz on Friday.',
      kind: 'manual',
    })
  })

  it('leaves the picker on its placeholder (no preselection) with several composable Courses', async () => {
    const base: Omit<Course, 'id' | 'name'> = {
      description: 'Calculus',
      sede: 'Linda Vista',
      programId: 'prog-1',
      level: 'primaria',
      status: 'published',
      capacity: 20,
      teacherId: 'tea-1',
      term: { start: '2026-02-02', end: '2026-08-13' },
      meetingDays: ['mon', 'wed', 'fri'],
      createdAt: '2026-01-01T00:00:00Z',
    }
    useStore.setState({
      courses: [
        { ...base, id: 'cou-a', name: 'Math 101' },
        { ...base, id: 'cou-b', name: 'Math 102' },
      ],
      announcements: [],
    })

    renderFeed()

    // Composer shows, but the trigger reads the "choose" placeholder — with two
    // cohorts nothing is silently preselected, so Post stays disabled until a pick.
    expect(
      await screen.findByRole('heading', { name: /post an announcement/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveTextContent(/choose a course/i)
    expect(screen.getByRole('button', { name: /^post$/i })).toBeDisabled()
  })

  it('withholds the composer when every scoped Course is closed — nowhere to post', async () => {
    const closed: Course = {
      id: 'cou-closed',
      name: 'Math 101',
      description: 'Calculus',
      sede: 'Linda Vista',
      programId: 'prog-1',
      level: 'primaria',
      status: 'closed',
      capacity: 20,
      teacherId: 'tea-1',
      term: { start: '2026-02-02', end: '2026-05-13' },
      meetingDays: ['mon', 'wed', 'fri'],
      createdAt: '2026-01-01T00:00:00Z',
    }
    useStore.setState({ courses: [closed], announcements: [] })

    renderFeed()

    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /post an announcement/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^post$/i })).not.toBeInTheDocument()
  })

  it('holds a skeleton until both queries resolve — never flashes the empty state (ADR-0030)', async () => {
    // Hold the Courses read open past the feed so an ungated feed would paint its
    // "No announcements yet" empty state before the Courses (for row names) land.
    const listCourses = api.courses.list
    vi.spyOn(api.courses, 'list').mockImplementation(async (...args) => {
      await delay(400)
      return listCourses(...args)
    })
    useStore.setState({ announcements: [] })

    renderFeed()

    // First synchronous paint: gate pending → no heading, no empty copy.
    expect(screen.queryByRole('heading', { name: /announcements/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/no announcements yet/i)).not.toBeInTheDocument()

    // Once both resolve, the section (and its designed empty state) appears.
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.getByText(/no announcements yet/i)).toBeInTheDocument()
  })
})
