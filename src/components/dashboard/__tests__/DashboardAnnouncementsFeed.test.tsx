import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

function renderFeed(courseId?: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardAnnouncementsFeed courseId={courseId} />
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

  // The Card shell is a plain div (ADR-0047), so the named region the old
  // `<section aria-labelledby>` carried is restated on the Card. Pin it: a future
  // registry re-pull that drops the role/label would otherwise pass every gate.
  it('exposes the feed as a region named by its heading', async () => {
    renderFeed()

    expect(await screen.findByRole('region', { name: 'Announcements' })).toBeInTheDocument()
  })

  it('lists the latest posts with their Course name and the Post button for composers', async () => {
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
    // Admin may compose, so the header carries the Post button (#367); the
    // composer itself lives in a Dialog and is absent until opened.
    expect(screen.getByRole('button', { name: /^post$/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('offers the Post button to a Teacher (owns Courses) but not to a Student', async () => {
    // Teacher: create rides `courseOwned`, and every scoped Course is owned, so
    // the Post button shows.
    useStore.getState().setRole('teacher')
    const { unmount } = renderFeed()
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^post$/i })).toBeInTheDocument()
    unmount()

    // Student: view-only, no create cell — never a compose affordance.
    useStore.getState().setRole('student')
    renderFeed()
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^post$/i })).not.toBeInTheDocument()
  })

  it('posts through the Dialog to the preselected Course and closes it', async () => {
    // Scope the store to a single non-closed cohort so the Dialog preselects a
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

    await userEvent.click(await screen.findByRole('button', { name: /^post$/i }))
    const dialog = await screen.findByRole('dialog', { name: /post an announcement/i })
    const textarea = within(dialog).getByPlaceholderText(/share an update with the class/i)
    await userEvent.type(textarea, 'Reminder: quiz on Friday.')
    await userEvent.click(within(dialog).getByRole('button', { name: /^post$/i }))

    const posted = useStore.getState().announcements
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      courseId: 'cou-solo',
      body: 'Reminder: quiz on Friday.',
      kind: 'manual',
    })
    // A successful post closes the Dialog.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
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

    // The Dialog shows, but the trigger reads the "choose" placeholder — with two
    // cohorts nothing is silently preselected, so Post stays disabled until a pick.
    await userEvent.click(await screen.findByRole('button', { name: /^post$/i }))
    const dialog = await screen.findByRole('dialog', { name: /post an announcement/i })
    expect(within(dialog).getByRole('combobox')).toHaveTextContent(/choose a course/i)
    expect(within(dialog).getByRole('button', { name: /^post$/i })).toBeDisabled()
  })

  it('withholds the Post button when every scoped Course is closed — nowhere to post', async () => {
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

  function post(id: string, courseId: string, daysAgo: number): Announcement {
    return {
      id,
      courseId,
      body: `Post ${id}`,
      kind: 'manual',
      createdAt: new Date(EPOCH.getTime() - daysAgo * 86_400_000).toISOString(),
    }
  }

  // The dashboard feed is a glance, not the inbox: the two newest posts, then a
  // way onward (ADR-0050).
  it('shows only the two newest posts', async () => {
    const [a, b] = useStore.getState().courses
    if (!a || !b) throw new Error('seed: needs two courses')
    useStore.setState({
      announcements: [post('ann-old', a.id, 9), post('ann-new', b.id, 1), post('ann-mid', a.id, 4)],
    })

    renderFeed()

    const region = await screen.findByRole('region', { name: 'Announcements' })
    expect(within(region).getByText('Post ann-new')).toBeInTheDocument()
    expect(within(region).getByText('Post ann-mid')).toBeInTheDocument()
    expect(within(region).queryByText('Post ann-old')).not.toBeInTheDocument()
  })

  it('drops the per-post course status badge', async () => {
    const [a, b] = useStore.getState().courses
    if (!a || !b) throw new Error('seed: needs two courses')
    useStore.setState({ announcements: [post('ann-1', a.id, 1), post('ann-2', b.id, 2)] })

    renderFeed()

    const region = await screen.findByRole('region', { name: 'Announcements' })
    await within(region).findByText('Post ann-1')
    expect(region.querySelector('[data-slot="badge"]')).toBeNull()
  })

  it('links View all to the Course when the feed is one Course’s (the TCU trainee’s)', async () => {
    const course = useStore.getState().courses.find((c) => c.status === 'published')
    if (!course) throw new Error('seed: needs a published course')
    useStore.setState({
      announcements: [
        post('ann-1', course.id, 1),
        post('ann-2', course.id, 2),
        post('ann-3', course.id, 3),
      ],
    })

    renderFeed(course.id)

    const link = await screen.findByRole('link', { name: /view all announcements/i })
    expect(link).toHaveAttribute('href', `/app/courses/${course.id}`)
  })

  // There is no all-announcements page, and the Courses list shows no feed, so a
  // cross-course feed has nowhere honest to send "View all".
  it('offers no View all link when the feed spans several Courses', async () => {
    const [a, b] = useStore.getState().courses
    if (!a || !b) throw new Error('seed: needs two courses')
    useStore.setState({
      announcements: [post('ann-1', a.id, 1), post('ann-2', b.id, 2), post('ann-3', a.id, 3)],
    })

    renderFeed()

    await screen.findByText('Post ann-1')
    expect(screen.queryByRole('link', { name: /view all announcements/i })).not.toBeInTheDocument()
  })
})
