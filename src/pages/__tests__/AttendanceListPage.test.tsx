import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { I18nProvider } from '@/lib/i18n'
import { AttendanceListPage } from '@/pages/AttendanceListPage'
import { api } from '@/data/api'
import { delay } from '@/data/api/_delay'
import { useStore } from '@/data/store'
import { clock } from '@/lib/clock'
import { attendanceRollup } from '@/lib/attendanceRollup'
import { buildAgenda } from '@/lib/agenda'
import { effectiveSessions, isSessionRecordable } from '@/lib/sessions'
import { formatPercent } from '@/lib/format'
import {
  clearPersistedCurrentUser,
  clearPersistedRole,
  clearPersistedState,
} from '@/data/persistence'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } })
  return render(
    <I18nProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <AttendanceListPage />
        </MemoryRouter>
      </QueryClientProvider>
    </I18nProvider>
  )
}

/** The rollup the page should paint, derived from the seeded store through the same lib. */
function expectedRows() {
  const s = useStore.getState()
  return attendanceRollup({
    courses: s.courses,
    attendance: s.attendance,
    sessionExceptions: s.sessionExceptions,
    now: clock.today(),
  })
}

describe('<AttendanceListPage /> — the per-course rollup (ADR-0051)', () => {
  beforeEach(() => {
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

  it('shows one row per course, worst first, each linking to its Sessions', async () => {
    const rows = expectedRows()
    expect(rows.length).toBeGreaterThan(0)
    renderPage()

    const table = await screen.findByRole('table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Course', 'Campus', 'Sessions held', 'Attendance', 'Unmarked'])
    const bodyRows = within(table).getAllByRole('row').slice(1)
    expect(bodyRows).toHaveLength(Math.min(rows.length, 10))

    const worst = rows[0]
    if (!worst) throw new Error('rollup is empty')
    const first = bodyRows[0]
    if (!first) throw new Error('table is empty')
    expect(within(first).getByRole('link', { name: worst.course.name })).toHaveAttribute(
      'href',
      `/app/courses/${worst.course.id}#sessions`
    )
    expect(first).toHaveTextContent(String(worst.sessionsHeld))
    if (worst.rate !== null) expect(first).toHaveTextContent(formatPercent(worst.rate, 'en'))
    expect(first).toHaveTextContent(`${worst.unmarked} unmarked`)
  })

  // The calendar's admin pulse links here with "N sessions need marking"; the
  // page states the same number, counted by the same rule (ADR-0051).
  it('states the calendar pulse’s needs-marking count above the table', async () => {
    const s = useStore.getState()
    const agenda = buildAgenda({
      role: 'admin',
      courses: s.courses,
      attendance: s.attendance,
      sessionExceptions: s.sessionExceptions,
      now: clock.today(),
    })
    if (agenda.role !== 'admin') throw new Error('expected the admin agenda')
    const n = agenda.pulse.unmarkedCount
    expect(n).toBeGreaterThan(1)
    renderPage()

    expect(await screen.findByText(`${n} sessions need marking`)).toBeInTheDocument()
  })

  it('reads a fully marked course as a dash, not a zero chip', async () => {
    const s = useStore.getState()
    const live = expectedRows().find((r) => r.needsMarking > 0)
    if (!live) throw new Error('seed: no in-progress course with sessions to mark')
    const course = live.course
    // One course, one present record on every Session it has held: nothing unmarked.
    const held = effectiveSessions(
      course,
      s.sessionExceptions.filter((e) => e.courseId === course.id)
    ).filter((x) => isSessionRecordable(x, clock.today()))
    useStore.setState({
      courses: [course],
      attendance: held.map((x, i) => ({
        id: `att-full-${i}`,
        courseId: course.id,
        studentId: 'stu-1',
        sessionDate: x.date,
        status: 'present' as const,
      })),
    })
    renderPage()

    const table = await screen.findByRole('table')
    const [row] = within(table).getAllByRole('row').slice(1)
    if (!row) throw new Error('table is empty')
    expect(row).not.toHaveTextContent('unmarked')
    expect(within(row).getAllByRole('cell').at(-1)).toHaveTextContent('—')
  })

  it('shows the illustrated empty state when no course has held a session', async () => {
    useStore.setState({ courses: [] })
    renderPage()

    expect(await screen.findByRole('heading', { name: /no attendance/i })).toBeInTheDocument()
  })

  // First-paint regression (ADR-0030): the rollup joins courses, attendance, and
  // session exceptions; holding attendance open must not paint every course as
  // fully unmarked off the default [].
  it('never paints a row before every read it joins has resolved', async () => {
    const listAttendance = api.attendance.list
    vi.spyOn(api.attendance, 'list').mockImplementation(async (filters) => {
      await delay(600)
      return listAttendance(filters)
    })
    const worst = expectedRows()[0]
    if (!worst) throw new Error('rollup is empty')

    let firstRowText: string | null = null
    const observer = new MutationObserver(() => {
      if (firstRowText !== null) return
      const row = document.querySelector('table tbody tr')
      if (row) firstRowText = row.textContent
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    try {
      renderPage()
      await screen.findByRole('table', {}, { timeout: 3000 })
      expect(firstRowText).toContain(worst.course.name)
      expect(firstRowText).toContain(`${worst.unmarked} unmarked`)
    } finally {
      observer.disconnect()
    }
  })
})
