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
import { DashboardAnnouncementsFeed } from '../DashboardAnnouncementsFeed'
import type { Announcement } from '@/types'

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

  it('lists the latest posts with their Course name and a compose entry for composers', async () => {
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
    // Admin may compose, so the entry point renders.
    expect(screen.getByRole('link', { name: /post an announcement/i })).toBeInTheDocument()
  })

  it('offers the compose entry to a Teacher (owns Courses) but not to a Student', async () => {
    // Teacher: create rides `courseOwned`, and every scoped Course is owned, so
    // the entry shows.
    useStore.getState().setRole('teacher')
    const { unmount } = renderFeed()
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /post an announcement/i })).toBeInTheDocument()
    unmount()

    // Student: view-only, no create cell — never a compose entry.
    useStore.getState().setRole('student')
    renderFeed()
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /post an announcement/i })).not.toBeInTheDocument()
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
