import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch } from '@/lib/clock'
import { useStore } from '@/data/store'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import { AdminDashboard } from '../AdminDashboard'

describe('AdminDashboard — four numbers, then the admin’s real worklists (ADR-0050)', () => {
  const EPOCH = new Date('2026-06-15T12:00:00.000Z')
  let queryClient: QueryClient

  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    setDemoEpoch(EPOCH)
    useStore.getState().setRole('admin')
    useStore.getState().setLocale('en')
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  function renderDashboard() {
    return render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AdminDashboard />
          </MemoryRouter>
        </QueryClientProvider>
      </I18nProvider>
    )
  }

  /** Re-pend one approved enrollment on an open cohort, so the request queue has a row. */
  function pendOneEnrollment() {
    const { enrollments, courses } = useStore.getState()
    const open = new Set(courses.filter((c) => c.status === 'published').map((c) => c.id))
    const target = enrollments.find((e) => e.status === 'approved' && open.has(e.courseId))
    if (!target) throw new Error('seed has no approved enrollment on an open cohort')
    useStore.setState({
      enrollments: enrollments.map((e) => (e === target ? { ...e, status: 'pending' } : e)),
    })
  }

  it('renders the four org stats', () => {
    renderDashboard()
    expect(screen.getByText(/total students/i)).toBeInTheDocument()
    expect(screen.getByText(/active courses/i)).toBeInTheDocument()
    expect(screen.getByText(/certificates issued/i)).toBeInTheDocument()
    expect(screen.getByText(/tcu hours/i)).toBeInTheDocument()
  })

  it('opens the main column with an h2, bridging the PageHeader h1 to the h3 cards', async () => {
    renderDashboard()
    const headings = await screen.findAllByRole('heading')
    expect(headings[0]?.tagName).toBe('H2')
  })

  it('orders the worklists: enrollment requests, TCU hours, courses to close, students at risk', async () => {
    renderDashboard()

    const order = [
      'Enrollment requests',
      'TCU hours to approve',
      'Courses to close',
      'Students at risk',
    ]
    for (const name of order) await screen.findByRole('heading', { level: 3, name })
    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
      .filter((text): text is string => order.includes(text ?? ''))
    expect(titles).toEqual(order)
  })

  // The certs card repeated the Certificates stat, the funnel was decorative, the
  // feed and the agenda aside were reading surfaces with no admin job to do.
  it('drops the certs card, the funnel, the announcements feed and the agenda aside', async () => {
    renderDashboard()
    await screen.findByRole('heading', { name: 'Students at risk' })

    expect(screen.queryByText(/certificates this epoch/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/enrollment funnel/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /announcements/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('takes an approved request off the queue and out of its count', async () => {
    const user = userEvent.setup()
    pendOneEnrollment()
    renderDashboard()

    const queue = await screen.findByRole('region', { name: 'Enrollment requests' })
    const pending = useStore.getState().enrollments.filter((e) => e.status === 'pending').length
    const heading = within(queue).getByRole('heading', { name: 'Enrollment requests' })
    expect(heading.parentElement).toHaveTextContent(String(pending))

    const table = within(queue).getByRole('table')
    const firstRow = within(table).getAllByRole('row')[1]
    if (!firstRow) throw new Error('queue should list the pending request')
    await user.click(within(firstRow).getByRole('button', { name: /^approve/i }))

    // Re-query the region each poll: at zero left the table unmounts entirely.
    const left = pending - 1
    const rowsNow = () =>
      within(screen.getByRole('region', { name: 'Enrollment requests' })).queryAllByRole('row')
    // The admin queue shows at most five rows; the badge carries the true total.
    await expect.poll(() => rowsNow().length).toBe(left > 0 ? Math.min(left, 5) + 1 : 0)
    if (left > 0) {
      const regionNow = screen.getByRole('region', { name: 'Enrollment requests' })
      const headingNow = within(regionNow).getByRole('heading', { name: 'Enrollment requests' })
      await expect.poll(() => headingNow.parentElement?.textContent).toContain(String(left))
    }
  })

  // Uncapped, a 15-row TCU queue plus its pager pushed the close and at-risk
  // worklists below the fold. The admin sees the five longest-waiting rows of
  // each queue, the full count, and a way to the full page.
  it.each([
    { title: 'Enrollment requests', to: '/app/enrollments', status: 'enrollments' as const },
    { title: 'TCU hours to approve', to: '/app/tcu', status: 'tcuActivities' as const },
  ])('caps the $title queue at five rows with View all to $to', async ({ title, to, status }) => {
    const pending = useStore.getState()[status].filter((r) => r.status === 'pending').length
    expect(pending, `seed should leave more than five ${title}`).toBeGreaterThan(5)
    renderDashboard()

    const queue = await screen.findByRole('region', { name: title })
    const table = within(queue).getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(5 + 1)
    const heading = within(queue).getByRole('heading', { name: title })
    expect(heading.parentElement).toHaveTextContent(String(pending))
    expect(within(queue).getByRole('link', { name: `View all (${pending})` })).toHaveAttribute(
      'href',
      to
    )
    expect(within(queue).queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })
})
