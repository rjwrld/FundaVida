import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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
import { TeacherDashboard } from '../TeacherDashboard'

const EPOCH = new Date('2026-06-23T15:30:00.000Z')

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <TeacherDashboard />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/**
 * `EnrollmentApprovalQueue` renders nothing without a pending request, and the
 * seeded `tea-1` persona has none. Re-pend one of their existing enrollments so
 * the card appears — flipping a seeded record keeps every store invariant
 * (real student, real course, matching Sede and level) that `requestEnrollment`
 * would otherwise have to satisfy.
 */
function pendOneEnrollmentForTeacher() {
  const { courses, enrollments } = useStore.getState()
  const teacherCourseIds = new Set(courses.filter((c) => c.teacherId === 'tea-1').map((c) => c.id))
  const target = enrollments.find((e) => teacherCourseIds.has(e.courseId))
  if (!target) throw new Error('seed has no enrollment on a tea-1 course')
  useStore.setState({
    enrollments: enrollments.map((e) => (e === target ? { ...e, status: 'pending' } : e)),
  })
}

describe('TeacherDashboard — worklist-first (ADR-0043)', () => {
  beforeEach(() => {
    setDemoEpoch(EPOCH)
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    useStore.getState().setRole('teacher')
    useStore.getState().setLocale('en')
  })

  it('leads with the needs-marking worklist and courses-to-close', async () => {
    renderDashboard()
    // Marking is the most time-sensitive job, so it heads the surface (ADR-0044).
    expect((await screen.findAllByText(/needs marking/i)).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /courses to close/i })).toBeInTheDocument()
  })

  // The Courses page is already teacher-scoped, so a "My courses" card only
  // repeated it (ADR-0050). The announcements feed stays, slimmed.
  it('drops the My courses card and keeps the announcements feed', async () => {
    renderDashboard()
    expect(await screen.findByRole('heading', { name: /announcements/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'My courses' })).not.toBeInTheDocument()
  })

  it('runs one column of worklists in order: marking, close, requests, TCU hours, announcements', async () => {
    pendOneEnrollmentForTeacher()
    renderDashboard()

    const order = [
      'Needs marking',
      'Courses to close',
      'Enrollment requests',
      'TCU hours to approve',
      'Announcements',
    ]
    for (const name of order) await screen.findByRole('heading', { level: 3, name })
    const aside = screen.getByRole('complementary')
    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .filter((h) => !aside.contains(h))
      .map((h) => h.textContent ?? '')
    expect(titles).toEqual(order)
  })

  it('opens the main column with an h2, bridging the PageHeader h1 to the h3 cards', async () => {
    renderDashboard()
    const headings = await screen.findAllByRole('heading')
    expect(headings[0]?.tagName).toBe('H2')
  })

  it('titles every main-column card at one level, so none reads as a child of another', async () => {
    pendOneEnrollmentForTeacher()
    renderDashboard()

    // The right-hand agenda column is its own landmark, with its own heading tree.
    const aside = await screen.findByRole('complementary')
    const inMainColumn = (h: HTMLElement) => !aside.contains(h)

    const cardTitles = [
      'Needs marking',
      'Courses to close',
      'Enrollment requests',
      'TCU hours to approve',
      'Announcements',
    ]

    // Await each title: the cards paint as their own queries settle, so a sync read
    // here would race whichever hook resolves last.
    for (const name of cardTitles) {
      const headings = (await screen.findAllByRole('heading', { name })).filter(inMainColumn)
      expect(headings.length, `"${name}" should title exactly one main-column card`).toBe(1)
      expect(headings[0]?.tagName, `"${name}" should be an h3 like its sibling cards`).toBe('H3')
    }

    // `heading-order` only fails on a skip *downward*, so axe cannot catch a card
    // that titles itself an h2 among h3 peers — it just silently adopts the cards
    // that follow it. The shell's sr-only section title is the column's only h2.
    const h2s = screen.getAllByRole('heading', { level: 2 }).filter(inMainColumn)
    expect(h2s.map((h) => h.textContent)).toEqual(['Your worklist'])
  })

  // Upcoming Sessions cannot be marked yet (ADR-0034), so a card that offered
  // "Mark attendance" on each one only led to the read-only future-Session page.
  // They stay visible in the agenda aside and on the calendar.
  it('offers no mark-attendance shortcut onto future Sessions', async () => {
    renderDashboard()
    await screen.findByRole('heading', { name: /announcements/i })
    expect(screen.queryByRole('heading', { name: /next sessions to mark/i })).toBeNull()
  })

  it('drops the retired "Author a course" prompt card', () => {
    renderDashboard()
    expect(screen.queryByText(/author a course/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /create a course/i })).not.toBeInTheDocument()
  })

  // The teacher has no Enrollments or TCU page to send "View all" to (both are
  // context-free-denied in the matrix), so the queues stay whole, with the pager.
  it('keeps the approval queues uncapped, with no View all link', async () => {
    pendOneEnrollmentForTeacher()
    renderDashboard()

    for (const name of ['Enrollment requests', 'TCU hours to approve']) {
      const queue = await screen.findByRole('region', { name })
      expect(within(queue).queryByRole('link', { name: /view all/i })).not.toBeInTheDocument()
    }
  })
})
