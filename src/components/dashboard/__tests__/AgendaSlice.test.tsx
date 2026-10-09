import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '@/lib/i18n'
import { setDemoEpoch, clock } from '@/lib/clock'
import { useStore } from '@/data/store'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { upcomingSessions } from '@/lib/sessions'
import { calendarCardName } from '@/lib/courseName'
import { formatDate } from '@/lib/format'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'
import type { Role } from '@/types'
import { AgendaSlice } from '../AgendaSlice'

// Clock pinned so Term boundaries line up with clock.now() (ADR-0002/0014).
const EPOCH = new Date('2026-06-15T12:00:00.000Z')

function renderSlice() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AgendaSlice />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/** The next three Sessions over the acting role's scoped Courses, as the slice derives them. */
async function expectedUpcoming() {
  const courses = await api.courses.list()
  const sessionExceptions = await api.sessionExceptions.list()
  return upcomingSessions(courses, clock.now(), 3, sessionExceptions).map((session) => {
    const course = courses.find((c) => c.id === session.courseId)
    if (!course) throw new Error(`upcoming Session for unknown course ${session.courseId}`)
    return { session, course }
  })
}

describe('<AgendaSlice /> — the aside is Upcoming only (ADR-0050)', () => {
  beforeEach(() => {
    clearPersistedState()
    clearPersistedRole()
    clearPersistedCurrentUser()
    useStore.getState().resetDemo()
    setDemoEpoch(EPOCH)
    useStore.getState().setLocale('en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each<Role>(['teacher', 'student'])(
    'lists the %s’s next three Sessions: short name, "Session n · date", row links to the Course',
    async (role) => {
      useStore.getState().setRole(role)
      const rows = await expectedUpcoming()
      expect(rows.length, 'seed should give the persona upcoming Sessions').toBeGreaterThan(0)

      renderSlice()

      const card = await screen.findByRole('region', { name: 'Upcoming' })
      expect(within(card).getAllByRole('listitem')).toHaveLength(rows.length)
      for (const { session, course } of rows) {
        const subtitle = within(card).getByText(
          `Session ${session.ordinal} · ${formatDate(session.date, 'en')}`
        )
        const row = subtitle.closest('li')
        if (!row) throw new Error('subtitle should sit in a row')
        const link = within(row).getByRole('link', { name: calendarCardName(course) })
        expect(link).toHaveAttribute('href', `/app/courses/${course.id}`)
        // Upcoming Sessions cannot be marked yet (ADR-0034): no button on the row.
        expect(within(row).queryByRole('button')).not.toBeInTheDocument()
      }
    }
  )

  it('carries no needs-marking hero for the teacher — the main-column card is the hero', async () => {
    useStore.getState().setRole('teacher')
    renderSlice()

    await screen.findByRole('region', { name: 'Upcoming' })
    expect(screen.queryByText(/needs marking/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/to mark/i)).not.toBeInTheDocument()
  })

  it('carries no "My progress" for the student — the courses table already shows attendance', async () => {
    useStore.getState().setRole('student')
    renderSlice()

    await screen.findByRole('region', { name: 'Upcoming' })
    expect(screen.queryByText(/my progress/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/attended/i)).not.toBeInTheDocument()
  })

  it('ends with an Open Calendar link to /app/calendar', async () => {
    useStore.getState().setRole('teacher')
    renderSlice()

    const link = await screen.findByRole('link', { name: /open calendar/i })
    expect(link).toHaveAttribute('href', '/app/calendar')
  })

  // First-paint regression (ADR-0030): an ungated slice would paint the
  // "Nothing on deck" empty state from an unresolved (default-[]) Courses read.
  it('never paints the empty state while Courses are still loading', async () => {
    useStore.getState().setRole('teacher')
    const listCourses = api.courses.list
    vi.spyOn(api.courses, 'list').mockImplementation(async (...args) => {
      await delay(400)
      return listCourses(...args)
    })

    let sawEmpty = false
    const observer = new MutationObserver(() => {
      if (document.body.textContent?.includes('Nothing on deck')) sawEmpty = true
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    try {
      renderSlice()
      await screen.findByRole('link', { name: /open calendar/i })
      expect(sawEmpty).toBe(false)
    } finally {
      observer.disconnect()
    }
  })
})
